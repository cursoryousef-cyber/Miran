import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { TimelineService } from '../timeline/timeline.service';
import { IAuthenticatedUser } from '../../common/interfaces';

const REQUIRED_APPROVER_ROLES = ['trainer', 'training_supervisor', 'hospital_administrator', 'university_administrator'];

@Injectable()
export class GraduationService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private timelineService: TimelineService,
  ) {}

  /**
   * Eligibility is read from the trainee timeline rather than recomputed here.
   * The timeline measures a trainee against the plan version they actually
   * started on, so this endpoint and every dashboard quote the same numbers.
   * This service keeps what is genuinely its own: the approval chain.
   */
  async checkEligibility(traineeProfileId: string) {
    const profile = await this.prisma.traineeProfile.findUnique({
      where: { id: traineeProfileId },
      select: { id: true, isLocked: true },
    });
    if (!profile) throw new NotFoundException('المتدرب غير موجود');
    if (profile.isLocked) throw new BadRequestException('ملف المتدرب مغلق ولا يمكن تعديله');

    const { data: readiness } = await this.timelineService.getGraduationReadiness(traineeProfileId);

    const pendingApprovals = REQUIRED_APPROVER_ROLES.filter(
      (r) => !readiness.approvals.submitted.includes(r),
    );

    return {
      eligible: readiness.readyForGraduation && pendingApprovals.length === 0,
      issues: readiness.remainingRequirements,
      pendingApprovals,
      approvedApprovals: readiness.approvals.submitted,
      overallCompletion: readiness.overallCompletion,
      expectedGraduationStatus: readiness.expectedGraduationStatus,
      remaining: readiness.remaining,
    };
  }

  async submitApproval(traineeProfileId: string, user: IAuthenticatedUser, notes?: string) {
    const profile = await this.prisma.traineeProfile.findUnique({ where: { id: traineeProfileId } });
    if (!profile) throw new NotFoundException('المتدرب غير موجود');
    if (profile.isLocked) throw new BadRequestException('ملف المتدرب مغلق');

    // Determine approver role from user's primary role
    const approverRole = user.roles?.[0];
    if (!REQUIRED_APPROVER_ROLES.includes(approverRole)) {
      throw new BadRequestException(`دورك "${approverRole}" غير مخول للموافقة على التخرج`);
    }

    const approval = await this.prisma.graduationApproval.upsert({
      where: { traineeProfileId_approverRole: { traineeProfileId, approverRole } },
      create: { traineeProfileId, approverRole, approvedById: user.accountId, notes },
      update: { approvedById: user.accountId, notes, approvedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: profile.organizationId,
        actorId: user.accountId,
        action: 'graduation_approval_submitted',
        entityType: 'TraineeProfile',
        entityId: traineeProfileId,
        newValues: { approverRole, notes },
      },
    });

    // Check if all required approvals are in — if yes, graduate automatically
    const allApprovals = await this.prisma.graduationApproval.findMany({ where: { traineeProfileId } });
    const approvedRoles = allApprovals.map(a => a.approverRole);
    const allDone = REQUIRED_APPROVER_ROLES.every(r => approvedRoles.includes(r));

    if (allDone) {
      await this.graduateTrainee(traineeProfileId, user.accountId);
    }

    return { success: true, data: approval, fullyApproved: allDone };
  }

  private async graduateTrainee(traineeProfileId: string, actorId: string) {
    const updated = await this.prisma.traineeProfile.update({
      where: { id: traineeProfileId },
      data: {
        applicationStatus: 'graduated',
        graduatedAt: new Date(),
        isLocked: true,
        archivedAt: new Date(),
        updatedById: actorId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: updated.organizationId,
        actorId,
        action: 'trainee_graduated',
        entityType: 'TraineeProfile',
        entityId: traineeProfileId,
        oldValues: { applicationStatus: 'active' },
        newValues: { applicationStatus: 'graduated', isLocked: true },
      },
    });

    // Notify all parties
    try {
      await this.notificationService.notifyOrgUsers(updated.organizationId, 'hospital_administrator', {
        titleAr: 'تهانينا — اكتمل تخرج المتدرب',
        bodyAr: 'أكمل المتدرب جميع متطلبات برنامج التدريب بنجاح',
        type: 'trainee_graduated',
        referenceType: 'TraineeProfile',
        referenceId: traineeProfileId,
        channels: ['in_app', 'email', 'push'],
      });
      if (updated.sponsorOrganizationId) {
        await this.notificationService.notifyOrgUsers(updated.sponsorOrganizationId, 'university_administrator', {
          titleAr: 'تهانينا — تخرج أحد طلابكم',
          bodyAr: 'أكمل طبيب الامتياز برنامج التدريب وحصل على شهادة الإتمام',
          type: 'trainee_graduated',
          referenceType: 'TraineeProfile',
          referenceId: traineeProfileId,
          channels: ['in_app', 'email', 'push'],
        });
      }
    } catch (e) { console.warn('Graduation notification error:', e); }

    return updated;
  }
}
