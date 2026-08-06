import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { IAuthenticatedUser } from '../../common/interfaces';

@Injectable()
export class ActivationService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Called when TrainingRequest.status transitions to 'active'.
   * For every cluster_approved/allocated TrainingRequestTrainee row in this request:
   *   1. Upsert a real TraineeProfile (or find existing one by nationalId/personId)
   *   2. Create a Rotation row covering the training period
   *   3. Seed CompetencyProgress from ProcedureCatalog matching the specialty
   *   4. Set TraineeProfile.applicationStatus → 'active'
   *   5. Write AuditLog
   *   6. Notify trainee, hospital, cluster, university
   */
  async activateRequest(trainingRequestId: string, actorId?: string) {
    const req = await this.prisma.trainingRequest.findUnique({
      where: { id: trainingRequestId },
      include: {
        trainees: {
          where: { status: { in: ['cluster_approved', 'allocated', 'hospital_review'] } },
          include: { assignedHospital: true },
        },
        sourceOrg: true,
        targetOrg: true,
      },
    });
    if (!req) throw new NotFoundException('الطلب غير موجود');

    const rows = req.trainees;
    if (!rows.length) {
      // No staged rows — nothing to activate (request-level activation only)
      return { activated: 0, message: 'لا توجد صفوف متدربين لتفعيلها' };
    }

    const activated: string[] = [];

    for (const row of rows) {
      // Find TraineeProfile linked to this staging row
      const profile = await this.prisma.traineeProfile.findUnique({
        where: { id: row.traineeProfileId ?? undefined },
      }).catch(() => null);

      if (!profile) continue;

      // 1. Activate profile status
      await this.prisma.traineeProfile.update({
        where: { id: profile.id },
        data: { applicationStatus: 'active', updatedById: actorId },
      });

      // 2. Mark TRT row as active
      await this.prisma.trainingRequestTrainee.update({
        where: { id: row.id },
        data: { status: 'active' },
      });

      // 3. Create a Rotation if the row has full assignment info
      if (row.assignedHospitalId && row.assignedDepartmentId && row.assignedTrainerProfileId) {
        const startDate = row.startDate ?? req.createdAt;
        const endDate = row.endDate ?? new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000);

        const existing = await this.prisma.rotation.findFirst({
          where: { traineeProfileId: profile.id, organizationId: row.assignedHospitalId },
        });

        if (!existing) {
          await this.prisma.rotation.create({
            data: {
              organizationId: row.assignedHospitalId,
              traineeProfileId: profile.id,
              departmentId: row.assignedDepartmentId,
              trainerProfileId: row.assignedTrainerProfileId,
              supervisorAccountId: row.assignedSupervisorAccountId ?? null,
              programId: req.programId ?? null,
              startDate,
              endDate,
              status: 'active',
              createdById: actorId,
            },
          });
        }
      }

      // 4. Seed CompetencyProgress from ProcedureCatalog matching specialty
      const specialty = row.specialty ?? profile.specialtyAr;
      if (specialty) {
        const procedures = await this.prisma.procedureCatalog.findMany({
          where: { isActive: true, category: { contains: specialty.split(' ')[0], mode: 'insensitive' } },
          take: 30,
        });

        for (const proc of procedures) {
          await this.prisma.competencyProgress.upsert({
            where: { traineeProfileId_procedureId: { traineeProfileId: profile.id, procedureId: proc.id } },
            create: {
              traineeProfileId: profile.id,
              procedureId: proc.id,
              requiredCount: proc.minRequired,
              completedCount: 0,
              status: 'pending',
            },
            update: {},
          });
        }
      }

      // 5. AuditLog
      await this.prisma.auditLog.create({
        data: {
          organizationId: req.targetOrgId,
          actorId,
          action: 'internship_activated',
          entityType: 'TraineeProfile',
          entityId: profile.id,
          oldValues: { applicationStatus: profile.applicationStatus },
          newValues: { applicationStatus: 'active', trainingRequestId },
        },
      });

      activated.push(profile.id);
    }

    // 6. Notifications
    try {
      const label = req.requestNumber;
      await this.notificationService.notifyOrgUsers(req.sourceOrgId, 'university_administrator', {
        titleAr: `تم تفعيل التدريب — ${label}`,
        bodyAr: `اكتمل قبول جميع المتدربين وبدأ برنامج التدريب رسمياً`,
        type: 'internship_activated',
        referenceType: 'TrainingRequest',
        referenceId: trainingRequestId,
        channels: ['in_app', 'email', 'push'],
      });
      await this.notificationService.notifyOrgUsers(req.targetOrgId, 'hospital_administrator', {
        titleAr: `متدربون جدد بدأوا التدريب — ${label}`,
        bodyAr: `تم تفعيل ${activated.length} متدرب في مستشفاكم`,
        type: 'internship_activated',
        referenceType: 'TrainingRequest',
        referenceId: trainingRequestId,
        channels: ['in_app', 'push'],
      });
    } catch (e) { console.warn('Activation notification error:', e); }

    return { activated: activated.length, profileIds: activated };
  }
}
