import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTrainingRequestDto, UpdateTrainingRequestDto } from './dto/training-request.dto';
import { IAuthenticatedUser } from '../../common/interfaces';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class TrainingRequestsService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async findAll(orgId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (orgId) {
      where.OR = [{ sourceOrgId: orgId }, { targetOrgId: orgId }];
    }

    const [total, data] = await Promise.all([
      this.prisma.trainingRequest.count({ where }),
      this.prisma.trainingRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sourceOrg: true,
          targetOrg: true,
          program: true,
          academicIntake: true,
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const request = await this.prisma.trainingRequest.findUnique({
      where: { id },
      include: {
        sourceOrg: true,
        targetOrg: true,
        program: true,
        academicIntake: true,
      },
    });

    if (!request) {
      throw new NotFoundException('طلب التدريب غير موجود');
    }

    return { data: request };
  }

  async create(dto: CreateTrainingRequestDto, user?: IAuthenticatedUser) {
    const reqCount = await this.prisma.trainingRequest.count();
    const requestNumber = `TR-${new Date().getFullYear()}-${(reqCount + 1).toString().padStart(4, '0')}`;
    const sourceOrgId = user?.organizationId || dto.targetOrgId;

    const created = await this.prisma.trainingRequest.create({
      data: {
        requestNumber,
        sourceOrgId,
        targetOrgId: dto.targetOrgId,
        programId: dto.programId,
        academicIntakeId: dto.academicIntakeId,
        studentCount: dto.studentCount,
        priority: dto.priority || 'normal',
        notes: dto.notes,
        status: 'submitted',
        createdById: user?.accountId,
      },
      include: {
        sourceOrg: true,
        targetOrg: true,
        program: true,
        academicIntake: true,
      },
    });

    // Send notification to target cluster admin
    try {
      await this.notificationService.notifyOrgUsers(
        dto.targetOrgId,
        'cluster_administrator',
        {
          titleAr: 'طلب تدريب جديد وارد',
          titleEn: 'New Training Request',
          bodyAr: `تم استلام طلب تدريب جديد (${requestNumber}) من ${created.sourceOrg?.nameAr || 'جامعة'} — عدد المتدربين: ${dto.studentCount}`,
          type: 'training_request',
          referenceType: 'TrainingRequest',
          referenceId: created.id,
        },
      );
    } catch (e) {
      // Notification failure should not block the request
      console.warn('Failed to send notification:', e);
    }

    return { data: created };
  }

  async update(id: string, dto: UpdateTrainingRequestDto, user?: IAuthenticatedUser) {
    const existing = await this.prisma.trainingRequest.findUnique({
      where: { id },
      include: { sourceOrg: true, targetOrg: true },
    });
    if (!existing) {
      throw new NotFoundException('طلب التدريب غير موجود');
    }

    const updated = await this.prisma.trainingRequest.update({
      where: { id },
      data: {
        status: dto.status || existing.status,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        allocations: (dto.allocations || existing.allocations) as any,
        updatedById: user?.accountId,
      },
      include: {
        sourceOrg: true,
        targetOrg: true,
        program: true,
        academicIntake: true,
      },
    });

    // Send notification on status change
    if (dto.status && dto.status !== existing.status) {
      try {
        const statusLabels: Record<string, string> = {
          approved: 'تمت الموافقة',
          allocated: 'تم التوزيع',
          rejected: 'تم الرفض',
          under_review: 'قيد المراجعة',
        };

        // Notify source org (university)
        await this.notificationService.notifyOrgUsers(
          existing.sourceOrgId,
          'university_administrator',
          {
            titleAr: `تحديث طلب التدريب ${existing.requestNumber}`,
            titleEn: `Training Request ${existing.requestNumber} Updated`,
            bodyAr: `تم تحديث حالة طلب التدريب إلى: ${statusLabels[dto.status] || dto.status}`,
            type: 'training_request_update',
            referenceType: 'TrainingRequest',
            referenceId: id,
          },
        );

        // If allocated, notify hospital admins
        if (dto.status === 'allocated' && dto.allocations) {
          for (const alloc of dto.allocations as any[]) {
            if (alloc.hospitalId) {
              await this.notificationService.notifyOrgUsers(
                alloc.hospitalId,
                'hospital_administrator',
                {
                  titleAr: 'تم تخصيص متدربين جدد لمستشفاكم',
                  titleEn: 'New trainees allocated to your hospital',
                  bodyAr: `تم تخصيص ${alloc.seats || 0} مقعد تدريبي لمستشفاكم ضمن طلب التدريب ${existing.requestNumber}`,
                  type: 'allocation',
                  referenceType: 'TrainingRequest',
                  referenceId: id,
                },
              );
            }
          }
        }
      } catch (e) {
        console.warn('Failed to send status notification:', e);
      }
    }

    return { data: updated };
  }
}
