import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTrainingRequestDto, UpdateTrainingRequestDto } from './dto/training-request.dto';
import { IAuthenticatedUser } from '../../common/interfaces';
import { NotificationService } from '../notifications/notification.service';
import { CapacityService } from '../organizations/capacity.service';
import { AllocationEngineService } from './allocation-engine.service';
import { ActivationService } from './activation.service';
import { RequestCompositionService } from './request-composition.service';
import {
  assertValidTransition,
  TRAINING_REQUEST_TRANSITIONS,
} from '../../common/state-machine/transition-guard';
import { TRAINING_REQUEST_STATUS } from '../../common/status-constants';
import { CAPABILITIES, ScopeContext } from '../../common/authz';

@Injectable()
export class TrainingRequestsService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private capacityService: CapacityService,
    private allocationEngine: AllocationEngineService,
    private activationService: ActivationService,
    private composition: RequestCompositionService,
  ) {}

  /**
   * The single query behind both the incoming-requests screen and the dashboard
   * counters. Scope comes from the resolved ScopeContext, so the notification
   * bell and this list can no longer disagree about which organisations the
   * session belongs to — they read the same `visibleOrgIds`.
   *
   * A cluster context sees requests addressed to the cluster *and* those of its
   * hospitals; a university sees the ones it sent.
   */
  async findAll(
    scope: ScopeContext,
    opts: { status?: string; page?: number; limit?: number } = {},
  ) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    // null means platform scope — unrestricted, and distinct from an empty list.
    if (scope.visibleOrgIds !== null) {
      where.OR = [
        { sourceOrgId: { in: scope.visibleOrgIds } },
        { targetOrgId: { in: scope.visibleOrgIds } },
      ];
    }

    if (opts.status) {
      const statuses = opts.status.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length > 0) where.status = { in: statuses };
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

  /**
   * Requests flow one way only: a sponsoring university asks a cluster to host
   * its students. The direction used to be unchecked, and production contains a
   * request whose source is a cluster and whose target is a hospital — a path
   * that bypasses cluster review entirely, because a hospital has no capability
   * to approve anything. Validating the endpoints here closes that path at the
   * only place it can be created.
   */
  private async assertRequestDirection(sourceOrgId: string, targetOrgId: string) {
    if (sourceOrgId === targetOrgId) {
      throw new BadRequestException('لا يمكن أن تكون الجهة المرسلة والمستقبلة واحدة');
    }

    const [source, target] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: sourceOrgId },
        select: { nameAr: true, organizationType: { select: { code: true } } },
      }),
      this.prisma.organization.findUnique({
        where: { id: targetOrgId },
        select: { nameAr: true, organizationType: { select: { code: true } } },
      }),
    ]);

    if (!source) throw new BadRequestException('الجهة المرسلة غير موجودة');
    if (!target) throw new BadRequestException('الجهة المستقبلة غير موجودة');

    const sourceType = source.organizationType?.code;
    const targetType = target.organizationType?.code;

    if (sourceType !== 'university' && sourceType !== 'college') {
      throw new BadRequestException(
        `طلب التدريب يُقدَّم من جامعة أو كلية فقط — «${source.nameAr}» جهة من نوع «${sourceType ?? 'غير محدد'}»`,
      );
    }

    if (targetType !== 'cluster') {
      throw new BadRequestException(
        `طلب التدريب يُوجَّه إلى تجمع صحي فقط — «${target.nameAr}» جهة من نوع «${targetType ?? 'غير محدد'}». ` +
          'التوزيع على المستشفيات يتم من إدارة التدريب بالتجمع بعد اعتماد الطلب.',
      );
    }
  }

  async create(dto: CreateTrainingRequestDto, user?: IAuthenticatedUser) {
    const reqCount = await this.prisma.trainingRequest.count();
    const requestNumber = `TR-${new Date().getFullYear()}-${(reqCount + 1).toString().padStart(4, '0')}`;
    const sourceOrgId = user?.organizationId || dto.targetOrgId;

    await this.assertRequestDirection(sourceOrgId, dto.targetOrgId);

    // Dates and the program/plan/version combination are validated together
    // before anything is written, so an incoherent request is never persisted.
    const dates = this.composition.validateDates(dto);
    const resolved = await this.composition.resolvePlan(dto, dates.startDate);

    const created = await this.prisma.trainingRequest.create({
      data: {
        requestNumber,
        sourceOrgId,
        targetOrgId: dto.targetOrgId,
        programId: dto.programId,
        specialty: dto.specialty,
        trainingPlanId: dto.trainingPlanId,
        trainingPlanVersionId: resolved.version?.id,
        trainingStartDate: dates.startDate,
        trainingEndDate: dates.endDate,
        expectedGraduationDate: dates.expectedGraduationDate,
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

    // Addressed by capability, so whoever owns request review in that cluster is
    // told — training_director included, which the hard-coded role code missed.
    try {
      await this.notificationService.notifyCapableUsers(
        dto.targetOrgId,
        CAPABILITIES.TRAINING_REQUEST_REVIEW,
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
        if ((dto.status === 'allocated' || dto.status === 'auto_allocated') && dto.allocations) {
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

    // Run intelligent placement engine across all cluster_approved TRT rows
    const rowResults = await this.allocationEngine.allocateRequest(
      id,
      request.targetOrgId,
      user?.accountId,
    );

    let allocated = rowResults.filter((r) => r.allocated).length;
    const failed = rowResults.filter((r) => !r.allocated).length;
    let allocationSummary: any[];

    if (allocated > 0) {
      // Full engine path — individual rows allocated
      allocationSummary = rowResults.map((r) => ({
        rowId: r.rowId,
        hospitalId: r.hospitalId,
        hospitalName: r.hospitalName,
        departmentId: r.departmentId,
        allocated: r.allocated,
        score: r.score,
        reason: r.reason,
      }));
    } else {
      // Fallback: no cluster_approved TRT rows yet (Phase 1 staging not used).
      // Distribute request.studentCount seats across hospitals by available capacity.
      const hospitals = await this.prisma.organization.findMany({
        where: { parentId: request.targetOrgId, status: 'active', deletedAt: null },
        select: { id: true, nameAr: true, code: true, capacity: true },
      });

      if (hospitals.length === 0) {
        throw new BadRequestException(
          'لا توجد مستشفيات مفعّلة تابعة للتجمع الصحي لتوزيع الطلاب عليها',
        );
      }

      allocationSummary = [];
      let remaining = request.studentCount;

      for (const hosp of hospitals) {
        if (remaining <= 0) break;
        const occ = await this.capacityService.getHospitalOccupancy(hosp.id);
        if (occ.available <= 0) continue;
        const take = Math.min(remaining, occ.available);
        remaining -= take;
        allocationSummary.push({
          hospitalId: hosp.id,
          hospitalCode: hosp.code,
          hospitalName: hosp.nameAr,
          capacity: occ.capacity,
          occupied: occ.occupied,
          available: occ.available,
          allocatedSeats: take,
          allocated: true,
          reason: 'توزيع تلقائي بالطاقة الاستيعابية المتاحة',
        });
        allocated += take;
      }

      if (allocated === 0) {
        throw new BadRequestException(
          'تعذر التوزيع: لا توجد مقاعد شاغرة في أي مستشفى تابع للتجمع الصحي. يرجى مراجعة الطاقة الاستيعابية المعلنة.',
        );
      }
    }

    assertValidTransition(
      'طلب التدريب',
      request.status,
      TRAINING_REQUEST_STATUS.AUTO_ALLOCATED,
      TRAINING_REQUEST_TRANSITIONS,
    );

    await this.prisma.trainingRequest.update({
      where: { id },
      data: {
        allocations: allocationSummary,
        status: 'auto_allocated',
        updatedById: user?.accountId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: request.targetOrgId,
        actorId: user?.accountId,
        action: 'auto_allocate_training_request',
        entityType: 'TrainingRequest',
        entityId: id,
        newValues: {
          status: 'auto_allocated',
          allocatedCount: rowResults.length > 0 ? rowResults.filter((r) => r.allocated).length : allocated,
          failedCount: failed,
          summary: allocationSummary,
        },
      },
    });

    const updated = await this.prisma.trainingRequest.findUnique({
      where: { id },
      include: { sourceOrg: true, targetOrg: true, academicIntake: true },
    });

    return {
      data: updated,
      rowResults,
      success: true,
      message: `تم التوزيع الذكي: ${allocated} متدرب مُوزَّع${failed > 0 ? ` — ${failed} لم يُوزَّع (تحتاج مراجعة الطاقة)` : ' بنجاح'}`,
    };
  }

  // ─── Manual Row Allocation Override ───────────────────────────────────────
  async allocateTraineeRow(
    rowId: string,
    hospitalId: string | undefined,
    user: IAuthenticatedUser,
  ) {
    const row = await this.prisma.trainingRequestTrainee.findUnique({
      where: { id: rowId },
    });
    if (!row) throw new NotFoundException('صف المتدرب غير موجود');

    if (!['cluster_approved', 'allocated'].includes(row.status)) {
      throw new BadRequestException(
        `لا يمكن إعادة توزيع صف بحالة "${row.status}". يجب أن يكون بحالة cluster_approved أو allocated`,
      );
    }

    const result = await this.allocationEngine.reallocateRow(
      rowId,
      user.accountId,
      hospitalId,
    );

    if (!result.allocated) {
      return {
        success: false,
        result,
        message: result.reason,
      };
    }

    return {
      success: true,
      result,
      message: `تم تعيين المتدرب إلى ${result.hospitalName} (تقييم: ${result.score?.toFixed(1)})`,
    };
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
        specialty: req.specialty,
        // The clone keeps the original's pinned version rather than jumping to the
        // latest one, so a re-submitted batch trains on the plan it was built for.
        trainingPlanId: req.trainingPlanId,
        trainingPlanVersionId: req.trainingPlanVersionId,
        trainingStartDate: req.trainingStartDate,
        trainingEndDate: req.trainingEndDate,
        expectedGraduationDate: req.expectedGraduationDate,
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

  // ─── Generic acceptance chain (Phase 5) ─────────────────────────────────
  // Maps current status → { next on approve, next on reject, next on return, notifyRole }
  private static readonly CHAIN_MAP: Record<string, { approve: string; notifyRole: string; label: string }> = {
    approved:                         { approve: 'hospital_administrator_accepted', notifyRole: 'hospital_administrator', label: 'مدير المستشفى' },
    hospital_accepted:                { approve: 'supervisor_accepted',            notifyRole: 'training_supervisor',    label: 'المشرف التدريبي' },
    hospital_administrator_accepted:  { approve: 'training_supervisor_accepted',   notifyRole: 'training_supervisor',    label: 'المشرف التدريبي' },
    supervisor_accepted:              { approve: 'trainer_accepted',               notifyRole: 'trainer',                label: 'المدرب السريري' },
    training_supervisor_accepted:     { approve: 'trainer_accepted',               notifyRole: 'trainer',                label: 'المدرب السريري' },
    trainer_accepted:                 { approve: 'active',                         notifyRole: 'trainee',                label: 'طبيب الامتياز' },
  };

  async advanceAcceptanceChain(
    id: string,
    action: 'approve' | 'reject' | 'return_to_cluster',
    notes?: string,
    user?: IAuthenticatedUser,
  ) {
    const req = await this.prisma.trainingRequest.findUnique({
      where: { id },
      include: { sourceOrg: true, targetOrg: true },
    });
    if (!req) throw new NotFoundException('الطلب غير موجود');

    const step = TrainingRequestsService.CHAIN_MAP[req.status];
    if (!step) throw new BadRequestException(`الحالة الحالية "${req.status}" ليست ضمن سلسلة القبول`);

    const nextStatus =
      action === 'approve'           ? step.approve :
      action === 'reject'            ? 'rejected' :
      /* return_to_cluster */          'hospital_returned_to_cluster';

    assertValidTransition('طلب التدريب', req.status, nextStatus, TRAINING_REQUEST_TRANSITIONS);

    const updated = await this.prisma.trainingRequest.update({
      where: { id },
      data: { status: nextStatus, notes: notes ? `${step.label}: ${notes}` : req.notes, updatedById: user?.accountId },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: req.targetOrgId,
        actorId: user?.accountId,
        action: `acceptance_chain_${action}`,
        entityType: 'TrainingRequest',
        entityId: id,
        oldValues: { status: req.status },
        newValues: { status: nextStatus, notes, actor: step.label },
      },
    });

    // Notify next actor if approved
    try {
      if (action === 'approve' && nextStatus !== 'active') {
        await this.notificationService.notifyOrgUsers(req.targetOrgId, step.notifyRole, {
          titleAr: `طلب تدريب بانتظار موافقتك — ${req.requestNumber}`,
          bodyAr: `وافق ${step.label} على الطلب وأحاله إليك للمراجعة والموافقة`,
          type: 'acceptance_chain',
          referenceType: 'TrainingRequest',
          referenceId: id,
          channels: ['in_app', 'email', 'push'],
        });
      } else if (action === 'approve' && nextStatus === 'active') {
        // Trigger full internship activation (rotations, competencies, profile status)
        await this.activationService.activateRequest(id, user?.accountId);
        await this.notificationService.notifyOrgUsers(req.sourceOrgId, 'university_administrator', {
          titleAr: `تم تفعيل التدريب — ${req.requestNumber}`,
          bodyAr: `اكتملت جميع خطوات القبول وتم تفعيل برنامج التدريب بنجاح`,
          type: 'training_activated',
          referenceType: 'TrainingRequest',
          referenceId: id,
          channels: ['in_app', 'email', 'push'],
        });
      } else if (action === 'reject') {
        await this.notificationService.notifyOrgUsers(req.sourceOrgId, 'university_administrator', {
          titleAr: `رُفض طلب التدريب — ${req.requestNumber}`,
          bodyAr: `رفض ${step.label} طلب التدريب${notes ? ': ' + notes : ''}`,
          type: 'training_rejected',
          referenceType: 'TrainingRequest',
          referenceId: id,
          channels: ['in_app', 'email', 'push'],
        });
      }
    } catch (e) { console.warn('Notification error:', e); }

    const actionLabel = action === 'approve' ? 'تمت الموافقة' : action === 'reject' ? 'تم الرفض' : 'أُعيد للتجمع';
    return { data: updated, success: true, message: `${actionLabel} من قِبَل ${step.label}` };
  }
}
