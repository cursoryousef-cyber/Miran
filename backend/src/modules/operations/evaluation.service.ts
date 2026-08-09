import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IAuthenticatedUser } from '../../common/interfaces';

/** Seconds below which a trainer evaluation is flagged as suspiciously fast. */
const SUSPICIOUS_SECONDS_THRESHOLD = 40;

@Injectable()
export class EvaluationService {
  constructor(private prisma: PrismaService) {}

  // ─── 1. Midpoint-meeting status ──────────────────────────────────────────

  async midpointStatus(rotationId: string, organizationId: string) {
    const rotation = await this.prisma.rotation.findUniqueOrThrow({
      where: { id: rotationId },
      select: {
        id: true,
        organizationId: true,
        midpointMeetingDone: true,
        midpointMeetingDate: true,
        midpointMeetingNotes: true,
        startDate: true,
        endDate: true,
        traineeProfile: { select: { person: { select: { nameAr: true } } } },
      },
    });
    if (rotation.organizationId !== organizationId) {
      throw new ForbiddenException('هذا الروتيشن خارج نطاق صلاحياتك التنظيمية');
    }
    return { data: rotation };
  }

  async completeMidpointMeeting(
    rotationId: string,
    notes: string | undefined,
    user: IAuthenticatedUser,
  ) {
    const existing = await this.prisma.rotation.findUniqueOrThrow({ where: { id: rotationId }, select: { organizationId: true } });
    if (existing.organizationId !== user.organizationId) {
      throw new ForbiddenException('هذا الروتيشن خارج نطاق صلاحياتك التنظيمية');
    }
    const rotation = await this.prisma.rotation.update({
      where: { id: rotationId },
      data: {
        midpointMeetingDone: true,
        midpointMeetingDate: new Date(),
        midpointMeetingNotes: notes,
        updatedById: user.accountId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.accountId,
        action: 'evaluation.midpoint_meeting_done',
        entityType: 'Rotation',
        entityId: rotationId,
        newValues: { notes } as Prisma.InputJsonValue,
      },
    });

    return { success: true, data: rotation };
  }

  // ─── 2. Trainer → Trainee evaluation (with all guards) ───────────────────

  async submitTrainerEvaluation(
    dto: {
      rotationId: string;
      evaluateeId: string;
      formId: string;
      evaluationType: string;
      scores: Record<string, unknown>;
      totalScore?: number;
      comments?: string;
      secondsSpent?: number;
    },
    user: IAuthenticatedUser,
  ) {
    // Gate 1: final evaluation requires midpoint meeting done
    if (dto.evaluationType === 'final_rotation' && dto.rotationId) {
      const rotation = await this.prisma.rotation.findUnique({
        where: { id: dto.rotationId },
        select: { midpointMeetingDone: true },
      });
      if (!rotation?.midpointMeetingDone) {
        throw new ForbiddenException(
          'لا يمكن إرسال التقييم النهائي قبل إتمام اجتماع منتصف الدورة. يرجى تسجيل الاجتماع أولاً.',
        );
      }
    }

    // Gate 2: mutual lock — final eval requires trainee dept evaluation first
    if (dto.evaluationType === 'final_rotation' && dto.rotationId) {
      const deptEval = await this.prisma.evaluation.findFirst({
        where: {
          rotationId: dto.rotationId,
          evaluateeId: dto.evaluateeId,
          evaluationType: 'department_by_trainee',
        },
      });
      if (!deptEval) {
        throw new ForbiddenException(
          'التقييم المتبادل: لا يُعتمد التقييم النهائي إلا بعد أن يُكمل المتدرب تقييمه للقسم.',
        );
      }
    }

    // Gate 3: low-score comment mandatory
    const total = dto.totalScore ?? 0;
    if (total < 60 && !dto.comments?.trim()) {
      throw new BadRequestException(
        'التقييمات المنخفضة (أقل من 60%) تستلزم تعليقاً إلزامياً يوضح السبب.',
      );
    }

    const isSuspicious =
      dto.secondsSpent !== undefined &&
      dto.secondsSpent < SUSPICIOUS_SECONDS_THRESHOLD;

    const evaluation = await this.prisma.evaluation.create({
      data: {
        organizationId: user.organizationId,
        formId: dto.formId,
        rotationId: dto.rotationId,
        evaluatorId: user.accountId,
        evaluateeId: dto.evaluateeId,
        evaluationType: dto.evaluationType,
        scores: (dto.scores ?? {}) as Prisma.InputJsonValue,
        totalScore: dto.totalScore,
        comments: dto.comments,
        secondsSpent: dto.secondsSpent,
        isSuspicious,
      },
      include: { form: true, rotation: { include: { department: true } } },
    });

    await this.prisma.notification.create({
      data: {
        organizationId: user.organizationId,
        userId: dto.evaluateeId,
        titleAr: `تقييم جديد: ${evaluation.form.nameAr}`,
        bodyAr: dto.comments || 'لديك تقييم جديد من مدربك',
        type: 'evaluation',
        referenceType: 'Evaluation',
        referenceId: evaluation.id,
        sentVia: 'in_app',
      },
    });

    if (isSuspicious) {
      // Notify supervisors: look up via UserRole → Role.code, then UserOrganization for org scope
      const supervisorRoles = await this.prisma.userRole.findMany({
        where: {
          organizationId: user.organizationId,
          role: { code: { in: ['academic_supervisor', 'training_supervisor', 'hospital_administrator'] } },
        },
        select: { userAccountId: true },
      });
      const notifiedIds = new Set<string>();
      for (const ur of supervisorRoles) {
        if (notifiedIds.has(ur.userAccountId)) continue;
        notifiedIds.add(ur.userAccountId);
        await this.prisma.notification.create({
          data: {
            organizationId: user.organizationId,
            userId: ur.userAccountId,
            titleAr: '⚠️ تنبيه: تقييم مشبوه',
            bodyAr: `أُرسل تقييم في ${dto.secondsSpent} ثانية — أقل من الحد الأدنى (${SUSPICIOUS_SECONDS_THRESHOLD}ث)`,
            type: 'suspicious_evaluation',
            referenceType: 'Evaluation',
            referenceId: evaluation.id,
            sentVia: 'in_app',
          },
        });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.accountId,
        action: `evaluation.submit.${dto.evaluationType}`,
        entityType: 'Evaluation',
        entityId: evaluation.id,
        newValues: { isSuspicious, totalScore: dto.totalScore } as Prisma.InputJsonValue,
      },
    });

    return { success: true, data: evaluation };
  }

  // ─── 3. Trainee → Department evaluation (anonymous toward dept) ──────────

  async submitDepartmentEvaluation(
    dto: {
      rotationId: string;
      formId: string;
      scores: Record<string, unknown>;
      totalScore?: number;
      comments?: string;
    },
    user: IAuthenticatedUser,
  ) {
    const rotation = await this.prisma.rotation.findUnique({
      where: { id: dto.rotationId },
      select: { departmentId: true, traineeProfileId: true },
    });
    if (!rotation) throw new BadRequestException('الروتيشن غير موجود');

    const existing = await this.prisma.evaluation.findFirst({
      where: {
        rotationId: dto.rotationId,
        evaluatorId: user.accountId,
        evaluationType: 'department_by_trainee',
      },
    });
    if (existing) throw new BadRequestException('لقد قيّمت هذا القسم مسبقاً لهذا الروتيشن.');

    const evaluation = await this.prisma.evaluation.create({
      data: {
        organizationId: user.organizationId,
        formId: dto.formId,
        rotationId: dto.rotationId,
        evaluatorId: user.accountId,
        evaluateeId: user.accountId,
        evaluationType: 'department_by_trainee',
        scores: (dto.scores ?? {}) as Prisma.InputJsonValue,
        totalScore: dto.totalScore,
        comments: dto.comments,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.accountId,
        action: 'evaluation.submit.department_by_trainee',
        entityType: 'Evaluation',
        entityId: evaluation.id,
        newValues: { rotationId: dto.rotationId } as Prisma.InputJsonValue,
      },
    });

    return { success: true, data: evaluation };
  }

  // ─── 4. Mutual-lock status for a rotation ────────────────────────────────

  async mutualLockStatus(rotationId: string, traineeAccountId: string) {
    const [trainerEval, deptEval] = await Promise.all([
      this.prisma.evaluation.findFirst({
        where: { rotationId, evaluateeId: traineeAccountId, evaluationType: 'final_rotation' },
      }),
      this.prisma.evaluation.findFirst({
        where: { rotationId, evaluatorId: traineeAccountId, evaluationType: 'department_by_trainee' },
      }),
    ]);
    return {
      data: {
        trainerEvaluationDone: Boolean(trainerEval),
        departmentEvaluationDone: Boolean(deptEval),
        mutualLockComplete: Boolean(trainerEval) && Boolean(deptEval),
        trainerEvaluationId: trainerEval?.id ?? null,
        departmentEvaluationId: deptEval?.id ?? null,
      },
    };
  }

  // ─── 5. Slow-evaluator report ────────────────────────────────────────────

  async slowEvaluatorReport(organizationId: string) {
    const suspicious = await this.prisma.evaluation.findMany({
      where: { organizationId, isSuspicious: true },
      include: { evaluator: { include: { person: { select: { nameAr: true } } } } },
      orderBy: { submittedAt: 'desc' },
    });

    const byEvaluator = new Map<string, { nameAr: string; count: number; lastAt: Date }>();
    for (const ev of suspicious) {
      const key = ev.evaluatorId;
      const prev = byEvaluator.get(key);
      if (prev) {
        prev.count++;
        if (ev.submittedAt > prev.lastAt) prev.lastAt = ev.submittedAt;
      } else {
        byEvaluator.set(key, {
          nameAr: ev.evaluator.person?.nameAr ?? ev.evaluatorId,
          count: 1,
          lastAt: ev.submittedAt,
        });
      }
    }

    const data = Array.from(byEvaluator.entries()).map(([evaluatorId, info]) => ({
      evaluatorId,
      nameAr: info.nameAr,
      suspiciousCount: info.count,
      lastSuspiciousAt: info.lastAt,
      advisoryNote: `${info.count} تقييم مشبوه — يُنصح بمراجعة تقييمات هذا المدرب`,
    }));

    return { data };
  }

  // ─── 6. Pending evaluations for a trainee ────────────────────────────────

  async myPendingEvaluations(user: IAuthenticatedUser) {
    const profile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
      select: { id: true },
    });

    if (profile) {
      const activeRotations = await this.prisma.rotation.findMany({
        where: { traineeProfileId: profile.id, status: 'active' },
        include: { department: { select: { nameAr: true } } },
      });

      const pendingDepartmentEvals = (
        await Promise.all(
          activeRotations.map(async (rot) => {
            const done = await this.prisma.evaluation.findFirst({
              where: {
                rotationId: rot.id,
                evaluatorId: user.accountId,
                evaluationType: 'department_by_trainee',
              },
            });
            return done ? null : { rotationId: rot.id, departmentNameAr: rot.department.nameAr };
          }),
        )
      ).filter(Boolean);

      const receivedEvals = await this.prisma.evaluation.findMany({
        where: { evaluateeId: user.accountId },
        include: { form: true, rotation: { include: { department: { select: { nameAr: true } } } } },
        orderBy: { submittedAt: 'desc' },
        take: 20,
      });

      return { data: { pendingDepartmentEvals, receivedEvals } };
    }

    // For trainers, return pending trainer evaluations for assigned trainees
    const trainer = await this.prisma.trainerProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });

    if (trainer) {
      const activeTrainerRotations = await this.prisma.rotation.findMany({
        where: { trainerProfileId: trainer.id, status: 'active' },
        include: {
          traineeProfile: { include: { person: true } },
          department: { select: { nameAr: true } },
        },
      });

      const pendingTrainerEvals = (
        await Promise.all(
          activeTrainerRotations.map(async (rot) => {
            const done = await this.prisma.evaluation.findFirst({
              where: { rotationId: rot.id, evaluatorId: user.accountId },
            });
            return done
              ? null
              : {
                  rotationId: rot.id,
                  traineeNameAr: rot.traineeProfile.person.nameAr,
                  departmentNameAr: rot.department.nameAr,
                  startDate: rot.startDate,
                  endDate: rot.endDate,
                };
          }),
        )
      ).filter(Boolean);

      return { data: { pendingTrainerEvals, pendingDepartmentEvals: [], receivedEvals: [] } };
    }

    return { data: { pendingDepartmentEvals: [], receivedEvals: [] } };
  }
}
