import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTrainingRequestDto, UpdateTrainingRequestDto } from './dto/training-request.dto';
import { IAuthenticatedUser } from '../../common/interfaces';
import { NotificationService } from '../notifications/notification.service';
import { CapacityService } from '../organizations/capacity.service';
import {
  assertValidTransition,
  TRAINING_REQUEST_TRANSITIONS,
} from '../../common/state-machine/transition-guard';
import { TRAINING_REQUEST_STATUS } from '../../common/status-constants';

@Injectable()
export class TrainingRequestsService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private capacityService: CapacityService,
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

    if (dto.status && dto.status !== existing.status) {
      assertValidTransition('طلب التدريب', existing.status, dto.status, TRAINING_REQUEST_TRANSITIONS);
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

  // ─── Smart Auto-Allocation Engine ──────────────────────────────────────────
  async autoAllocate(id: string, user?: IAuthenticatedUser) {
    const request = await this.prisma.trainingRequest.findUnique({
      where: { id },
      include: { sourceOrg: true, targetOrg: true, academicIntake: true },
    });
    if (!request) throw new NotFoundException('طلب التدريب غير موجود');

    // 1. Fetch hospitals within target cluster
    const hospitals = await this.prisma.organization.findMany({
      where: {
        parentId: request.targetOrgId,
        status: 'active',
        deletedAt: null,
      },
      include: {
        departments: { where: { isActive: true } },
        _count: { select: { traineeProfiles: true } },
      },
    });

    if (hospitals.length === 0) {
      throw new BadRequestException('لا توجد مستشفيات مفعّلة تابعة للتجمع الصحي لتوزيع الطلاب عليها');
    }

    // 2. Fetch unassigned trainees for this intake/request
    const trainees = await this.prisma.traineeProfile.findMany({
      where: {
        academicIntakeId: request.academicIntakeId || undefined,
      },
      include: { person: true },
    });

    const totalToAllocate = trainees.length > 0 ? trainees.length : request.studentCount;
    let remaining = totalToAllocate;
    const allocations: any[] = [];

    // 3. Allocate evenly or based on capacity
    for (const hosp of hospitals) {
      if (remaining <= 0) break;
      const { capacity: totalCap, occupied: currentOccupied, available: availableSeats } =
        await this.capacityService.getHospitalOccupancy(hosp.id);

      if (availableSeats <= 0) continue;

      const takeSeats = Math.min(remaining, availableSeats);
      remaining -= takeSeats;

      allocations.push({
        hospitalId: hosp.id,
        hospitalCode: hosp.code,
        hospitalName: hosp.nameAr,
        capacity: totalCap,
        occupied: currentOccupied,
        available: availableSeats,
        allocatedSeats: takeSeats,
        status: 'allocated',
      });
    }

    if (allocations.length === 0 && totalToAllocate > 0) {
      throw new BadRequestException(
        'تعذر التوزيع: لا توجد مقاعد شاغرة في أي مستشفى تابع للتجمع الصحي. يرجى مراجعة الطاقة الاستيعابية المعلنة من المستشفيات.',
      );
    }

    assertValidTransition(
      'طلب التدريب',
      request.status,
      TRAINING_REQUEST_STATUS.AUTO_ALLOCATED,
      TRAINING_REQUEST_TRANSITIONS,
    );

    const updated = await this.prisma.trainingRequest.update({
      where: { id },
      data: {
        allocations,
        status: 'auto_allocated',
        updatedById: user?.accountId,
      },
      include: { sourceOrg: true, targetOrg: true, academicIntake: true },
    });

    // Record audit trail
    await this.prisma.auditLog.create({
      data: {
        organizationId: request.targetOrgId,
        actorId: user?.accountId,
        action: 'auto_allocate_training_request',
        entityType: 'TrainingRequest',
        entityId: id,
        newValues: { allocations, status: 'auto_allocated' },
      },
    });

    return { data: updated, success: true, message: 'تم التوزيع الذكي للطلاب بنجاح بناءً على الطاقة الاستيعابية للمستشفيات' };
  }

  // ─── Capacity Validation Check ─────────────────────────────────────────────
  async validateCapacity(id: string) {
    const request = await this.prisma.trainingRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('طلب التدريب غير موجود');

    const allocations: any[] = (request.allocations as any[]) || [];
    const errors: string[] = [];

    for (const alloc of allocations) {
      const hosp = await this.prisma.organization.findUnique({
        where: { id: alloc.hospitalId },
        include: {
          departments: { where: { isActive: true } },
          _count: { select: { traineeProfiles: true } },
        },
      });

      if (!hosp || hosp.status !== 'active') {
        errors.push(`المستشفى (${alloc.hospitalName || alloc.hospitalId}) غير نشط أو غير موجود`);
        continue;
      }

      const { capacity: totalCap, occupied: currentOccupied } =
        await this.capacityService.getHospitalOccupancy(hosp.id);
      const requestedSeats = Number(alloc.allocatedSeats || alloc.seats || 0);

      if (currentOccupied + requestedSeats > totalCap) {
        errors.push(`التوزيع على (${hosp.nameAr}) يتجاوز الطاقة الاستيعابية (${totalCap} مقعد). الحالي: ${currentOccupied}، المطلوب: ${requestedSeats}`);
      }

      if (hosp.departments.length === 0) {
        errors.push(`المستشفى (${hosp.nameAr}) لا يحتوي على أقسام سريرية مفعّلة`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ─── Approval Workflow Actions ─────────────────────────────────────────────
  async approve(id: string, user?: IAuthenticatedUser) {
    const existing = await this.prisma.trainingRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('طلب التدريب غير موجود');

    const validation = await this.validateCapacity(id);
    if (!validation.isValid) {
      throw new BadRequestException(
        `تعذر الاعتماد بسبب أخطاء الطاقة الاستيعابية:\n${validation.errors.join('\n')}`,
      );
    }

    assertValidTransition(
      'طلب التدريب',
      existing.status,
      TRAINING_REQUEST_STATUS.APPROVED,
      TRAINING_REQUEST_TRANSITIONS,
    );

    const updated = await this.prisma.trainingRequest.update({
      where: { id },
      data: {
        status: 'approved',
        updatedById: user?.accountId,
      },
      include: { sourceOrg: true, targetOrg: true },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: updated.targetOrgId,
        actorId: user?.accountId,
        action: 'approve_training_request',
        entityType: 'TrainingRequest',
        entityId: id,
        newValues: { status: 'approved' },
      },
    });

    // Notify receiving hospitals & university
    try {
      await this.notificationService.notifyOrgUsers(
        updated.sourceOrgId,
        'university_administrator',
        {
          titleAr: `تمت الموافقة النهائية على طلب التدريب ${updated.requestNumber}`,
          titleEn: `Training Request ${updated.requestNumber} Approved`,
          bodyAr: `قام التجمع الصحي باعتام توزيع طلب التدريب ${updated.requestNumber} بنجاح.`,
          type: 'request_approved',
          referenceType: 'TrainingRequest',
          referenceId: id,
        },
      );
    } catch (e) {
      console.warn('Notification error:', e);
    }

    return { data: updated, success: true, message: 'تمت الموافقة النهائية وتوثيق التوزيع بنجاح' };
  }

  async reject(id: string, reason?: string, user?: IAuthenticatedUser) {
    const existing = await this.prisma.trainingRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('طلب التدريب غير موجود');

    assertValidTransition(
      'طلب التدريب',
      existing.status,
      TRAINING_REQUEST_STATUS.REJECTED,
      TRAINING_REQUEST_TRANSITIONS,
    );

    const updated = await this.prisma.trainingRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        notes: reason ? `سبب الرفض: ${reason}` : undefined,
        updatedById: user?.accountId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: updated.targetOrgId,
        actorId: user?.accountId,
        action: 'reject_training_request',
        entityType: 'TrainingRequest',
        entityId: id,
        newValues: { status: 'rejected', reason },
      },
    });

    return { data: updated, success: true, message: 'تم رفض طلب التدريب' };
  }

  async returnToUniversity(id: string, notes?: string, user?: IAuthenticatedUser) {
    const existing = await this.prisma.trainingRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('طلب التدريب غير موجود');

    assertValidTransition(
      'طلب التدريب',
      existing.status,
      TRAINING_REQUEST_STATUS.RETURNED_TO_UNIVERSITY,
      TRAINING_REQUEST_TRANSITIONS,
    );

    const updated = await this.prisma.trainingRequest.update({
      where: { id },
      data: {
        status: 'returned_to_university',
        notes: notes ? `ملاحظات الإعادة للجامعة: ${notes}` : undefined,
        updatedById: user?.accountId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: updated.targetOrgId,
        actorId: user?.accountId,
        action: 'return_training_request_to_university',
        entityType: 'TrainingRequest',
        entityId: id,
        newValues: { status: 'returned_to_university', notes },
      },
    });

    return { data: updated, success: true, message: 'تمت إعادة طلب التدريب إلى الجامعة للتعديل' };
  }

  async cloneRequest(id: string, user?: IAuthenticatedUser) {
    const req = await this.prisma.trainingRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('الطلب غير موجود');

    const reqCount = await this.prisma.trainingRequest.count();
    const requestNumber = `TR-${new Date().getFullYear()}-${(reqCount + 1).toString().padStart(4, '0')}`;

    const cloned = await this.prisma.trainingRequest.create({
      data: {
        requestNumber,
        sourceOrgId: req.sourceOrgId,
        targetOrgId: req.targetOrgId,
        programId: req.programId,
        academicIntakeId: req.academicIntakeId,
        studentCount: req.studentCount,
        priority: req.priority,
        notes: `نسخة مستنسخة من الطلب ${req.requestNumber}`,
        allocations: req.allocations as any,
        status: 'draft',
        createdById: user?.accountId,
      },
    });

    return { data: cloned, success: true, message: `تم استنساخ الطلب بنجاح برقم جديد (${requestNumber})` };
  }

  // Deliberate administrative escape hatch: bypasses the transition table to
  // recover a stuck request, so it is always audited.
  async resetRequest(id: string, user?: IAuthenticatedUser) {
    const existing = await this.prisma.trainingRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('طلب التدريب غير موجود');

    const updated = await this.prisma.trainingRequest.update({
      where: { id },
      data: {
        allocations: [],
        status: TRAINING_REQUEST_STATUS.SUBMITTED,
        updatedById: user?.accountId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: existing.targetOrgId,
        actorId: user?.accountId,
        action: 'reset_training_request',
        entityType: 'TrainingRequest',
        entityId: id,
        oldValues: { status: existing.status, allocations: existing.allocations as any },
        newValues: { status: TRAINING_REQUEST_STATUS.SUBMITTED, allocations: [] },
      },
    });

    return { data: updated, success: true, message: 'تم تصفير التوزيعات وإعادة الطلب إلى الحالة الأولية' };
  }

  // ─── Multi-Stage Hospital Acceptance Workflow ─────────────────────────────
  async acceptByHospitalDirector(id: string, notes?: string, user?: IAuthenticatedUser) {
    const req = await this.prisma.trainingRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('الطلب غير موجود');

    assertValidTransition('طلب التدريب', req.status, 'hospital_accepted', TRAINING_REQUEST_TRANSITIONS);

    const updated = await this.prisma.trainingRequest.update({
      where: { id },
      data: {
        status: 'hospital_accepted',
        notes: notes ? `قبول مدير المستشفى: ${notes}` : req.notes,
        updatedById: user?.accountId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: req.targetOrgId,
        actorId: user?.accountId,
        action: 'accept_by_hospital_director',
        entityType: 'TrainingRequest',
        entityId: id,
        newValues: { status: 'hospital_accepted', notes },
      },
    });

    return { data: updated, success: true, message: 'تمت موافقة مدير المستشفى وإحالة الطلب للمشرف التدريبي' };
  }

  async acceptBySupervisor(id: string, notes?: string, user?: IAuthenticatedUser) {
    const req = await this.prisma.trainingRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('الطلب غير موجود');

    assertValidTransition('طلب التدريب', req.status, 'supervisor_accepted', TRAINING_REQUEST_TRANSITIONS);

    const updated = await this.prisma.trainingRequest.update({
      where: { id },
      data: {
        status: 'supervisor_accepted',
        notes: notes ? `موافقة المشرف: ${notes}` : req.notes,
        updatedById: user?.accountId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: req.targetOrgId,
        actorId: user?.accountId,
        action: 'accept_by_supervisor',
        entityType: 'TrainingRequest',
        entityId: id,
        newValues: { status: 'supervisor_accepted', notes },
      },
    });

    return { data: updated, success: true, message: 'تمت موافقة المشرف التدريبي وإحالة الطلب للمدرب السريري' };
  }

  async acceptByTrainer(id: string, notes?: string, user?: IAuthenticatedUser) {
    const req = await this.prisma.trainingRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('الطلب غير موجود');

    assertValidTransition(
      'طلب التدريب',
      req.status,
      TRAINING_REQUEST_STATUS.TRAINER_ACCEPTED,
      TRAINING_REQUEST_TRANSITIONS,
    );

    const updated = await this.prisma.trainingRequest.update({
      where: { id },
      data: {
        status: 'trainer_accepted',
        notes: notes ? `موافقة المدرب: ${notes}` : req.notes,
        updatedById: user?.accountId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: req.targetOrgId,
        actorId: user?.accountId,
        action: 'accept_by_trainer',
        entityType: 'TrainingRequest',
        entityId: id,
        newValues: { status: 'trainer_accepted', notes },
      },
    });

    return { data: updated, success: true, message: 'تمت موافقة المدرب السريري وتفعيل المقعد للطلاب' };
  }

  async acceptByIntern(id: string, user?: IAuthenticatedUser) {
    const req = await this.prisma.trainingRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('الطلب غير موجود');

    assertValidTransition(
      'طلب التدريب',
      req.status,
      TRAINING_REQUEST_STATUS.ACTIVE,
      TRAINING_REQUEST_TRANSITIONS,
    );

    const updated = await this.prisma.trainingRequest.update({
      where: { id },
      data: {
        status: 'active',
        updatedById: user?.accountId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: req.targetOrgId,
        actorId: user?.accountId,
        action: 'accept_by_intern',
        entityType: 'TrainingRequest',
        entityId: id,
        newValues: { status: 'active' },
      },
    });

    return { data: updated, success: true, message: 'تم قبول التدريب وتفعيل الخطة للأطياء المقبولين بنجاح' };
  }
}
