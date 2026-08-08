import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { CurrentUser, RequireRoles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { EvaluationService } from './evaluation.service';
import {
  CAPABILITIES, CapabilityGuard, RequireCapability,
} from '../../common/authz';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@ApiTags('Production Operations')
@ApiBearerAuth('JWT-auth')
@Controller('operations')
@UseGuards(JwtAuthGuard, RolesGuard, CapabilityGuard)
export class OperationsController {
  constructor(
    private prisma: PrismaService,
    private timelineService: TimelineService,
    private evaluationService: EvaluationService,
  ) {}

  @Get('trainer/dashboard')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner')
  async trainerDashboard(@CurrentUser() user: IAuthenticatedUser) {
    const trainer = await this.myTrainer(user);
    const traineeWhere = trainer
      ? { rotations: { some: { trainerProfileId: trainer.id, organizationId: user.organizationId, status: 'active' } } }
      : { organizationId: user.organizationId };
    const assignedTrainees = await this.prisma.traineeProfile.count({ where: traineeWhere });
    const pendingAttendance = await this.prisma.attendance.count({ where: { organizationId: user.organizationId, status: 'correction_requested' } });
    const pendingLogbook = await this.prisma.clinicalCaseLog.count({
      where: { organizationId: user.organizationId, ...(trainer ? { trainerProfileId: trainer.id } : {}), status: { in: ['submitted', 'modification_requested'] } },
    });
    const activeRotations = await this.prisma.rotation.count({
      where: { organizationId: user.organizationId, ...(trainer ? { trainerProfileId: trainer.id } : {}), status: 'active' },
    });
    const openCalls = await this.prisma.trainerCall.count({ where: { organizationId: user.organizationId, status: 'active' } });
    const dueTasks = await this.prisma.task.count({ where: { organizationId: user.organizationId, assignedToId: user.accountId, status: { not: 'completed' } } });
    const unreadNotifications = await this.prisma.notification.count({ where: { userId: user.accountId, isRead: false } });

    const assignedTraineeIds = (
      await this.prisma.traineeProfile.findMany({ where: traineeWhere, select: { id: true } })
    ).map((t) => t.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysAttendance = assignedTraineeIds.length
      ? await this.prisma.attendance.findMany({ where: { traineeProfileId: { in: assignedTraineeIds }, date: today } })
      : [];
    const presentToday = todaysAttendance.filter((a) => a.status === 'present').length;
    const notCheckedIn = assignedTraineeIds.length - todaysAttendance.length;
    // Evaluation rows only exist once submitted (submittedAt is non-nullable),
    // so "pending" is derived the same way the existing my-pending endpoint
    // derives it, not by querying Evaluation directly.
    const pendingEvaluationsResult = await this.evaluationService.myPendingEvaluations(user).catch(() => ({ data: [] as unknown[] }));
    const pendingEvaluations = (pendingEvaluationsResult as any)?.data?.length ?? 0;
    const incompleteCompetencies = assignedTraineeIds.length
      ? await this.prisma.competencyProgress.count({ where: { traineeProfileId: { in: assignedTraineeIds }, status: { not: 'completed' } } })
      : 0;

    return {
      data: {
        assignedTrainees, pendingAttendance, pendingLogbook, activeRotations, openCalls, dueTasks, unreadNotifications,
        presentToday, absentOrNotCheckedIn: notCheckedIn, pendingEvaluations, incompleteCompetencies,
      },
    };
  }

  @Get('trainer/assigned-interns')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner')
  async assignedInterns(@CurrentUser() user: IAuthenticatedUser) {
    const trainer = await this.myTrainer(user);
    const data = await this.prisma.traineeProfile.findMany({
      where: trainer ? { rotations: { some: { trainerProfileId: trainer.id, organizationId: user.organizationId, status: 'active' } } } : { organizationId: user.organizationId },
      include: { person: true, organization: true, rotations: { where: { status: 'active' }, include: { department: true, trainerProfile: { include: { person: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return { data };
  }

  /**
   * Assignment requests awaiting this trainer's accept/reject. Scope is
   * derived from the trainer's own JWT → TrainerProfile, never from a client
   * -supplied trainerProfileId, so a trainer only ever sees rotations where
   * they themselves are trainerProfileId.
   */
  @Get('trainer/assignment-requests')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner')
  async assignmentRequests(@CurrentUser() user: IAuthenticatedUser) {
    const trainer = await this.myTrainer(user);
    if (!trainer) return { data: [] };
    const data = await this.prisma.rotation.findMany({
      where: { trainerProfileId: trainer.id, status: 'pending_acceptance' },
      include: {
        traineeProfile: { include: { person: true, program: true, sponsorOrganization: true } },
        department: true,
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data };
  }

  @Post('trainer/assignment-requests/:rotationId/accept')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner')
  async acceptAssignmentRequest(@Param('rotationId') rotationId: string, @CurrentUser() user: IAuthenticatedUser) {
    const trainer = await this.myTrainer(user);
    const rotation = await this.prisma.rotation.findFirst({
      where: { id: rotationId, trainerProfileId: trainer?.id, status: 'pending_acceptance' },
    });
    if (!rotation) throw new BadRequestException('لا يوجد طلب إسناد بانتظار قبولك بهذا المعرف');

    const data = await this.prisma.rotation.update({ where: { id: rotationId }, data: { status: 'active' } });
    await this.audit(user, 'rotation.trainer_accept', 'Rotation', rotationId, data);
    return { success: true, data };
  }

  @Post('trainer/assignment-requests/:rotationId/reject')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner')
  async rejectAssignmentRequest(
    @Param('rotationId') rotationId: string,
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: { reason?: string },
  ) {
    if (!dto.reason?.trim()) throw new BadRequestException('سبب الرفض إلزامي');
    const trainer = await this.myTrainer(user);
    const rotation = await this.prisma.rotation.findFirst({
      where: { id: rotationId, trainerProfileId: trainer?.id, status: 'pending_acceptance' },
    });
    if (!rotation) throw new BadRequestException('لا يوجد طلب إسناد بانتظار قبولك بهذا المعرف');

    const data = await this.prisma.rotation.update({
      where: { id: rotationId },
      data: { status: 'rejected', completionNotes: dto.reason },
    });
    await this.audit(user, 'rotation.trainer_reject', 'Rotation', rotationId, data);

    // Send the assignment back to the hospital's training administration by
    // clearing the trainer/department on the still-open allocation — the same
    // existing /allocations/department call reassigns it, no new workflow.
    const allocation = await this.prisma.traineeAllocation.findFirst({
      where: { traineeProfileId: rotation.traineeProfileId, hospitalId: rotation.organizationId, status: 'open' },
    });
    if (allocation) {
      await this.prisma.traineeAllocation.update({
        where: { id: allocation.id },
        data: { trainerProfileId: null, departmentId: null },
      });
      if (allocation.performedById) {
        await this.notify(
          rotation.organizationId,
          allocation.performedById,
          'رفض المدرب طلب الإسناد',
          `تم رفض إسناد متدرب — السبب: ${dto.reason}`,
          'trainee_assignment_rejected',
          'Rotation',
          rotationId,
        );
      }
    }
    return { success: true, data };
  }

  /**
   * Trainee groups — the trainer's own assigned trainees (same scope query as
   * assigned-interns) bucketed by department + active rotation, so a trainer
   * with several cohorts can see and message one at a time. Not a new entity:
   * grouping is computed over Rotation/TraineeAllocation, which already carry
   * department/dates, so there is nothing here to persist.
   */
  @Get('trainer/groups')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner')
  async trainerGroups(@CurrentUser() user: IAuthenticatedUser) {
    const trainer = await this.myTrainer(user);
    const trainees = await this.prisma.traineeProfile.findMany({
      where: trainer
        ? { rotations: { some: { trainerProfileId: trainer.id, organizationId: user.organizationId, status: 'active' } } }
        : { organizationId: user.organizationId },
      include: {
        person: true,
        rotations: { where: { status: 'active' }, include: { department: true } },
      },
    });

    const groups = new Map<string, { departmentId: string; departmentNameAr: string; trainees: unknown[] }>();
    for (const t of trainees) {
      const rotation = t.rotations[0];
      if (!rotation) continue;
      const key = rotation.departmentId;
      if (!groups.has(key)) {
        groups.set(key, { departmentId: key, departmentNameAr: rotation.department.nameAr, trainees: [] });
      }
      groups.get(key)!.trainees.push({ id: t.id, nameAr: t.person.nameAr, traineeNumber: t.traineeNumber, startDate: rotation.startDate, endDate: rotation.endDate });
    }

    return { data: Array.from(groups.values()) };
  }

  /**
   * Incoming requests requiring THIS trainer's action — not hospital-wide.
   * Aggregates the same reads the dedicated endpoints already expose
   * (evaluationService.myPendingEvaluations, submitted clinical logs scoped
   * to the trainer) into one worklist; no new workflow or storage.
   */
  @Get('trainer/incoming-requests')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner')
  async trainerIncomingRequests(@CurrentUser() user: IAuthenticatedUser) {
    const trainer = await this.myTrainer(user);
    const [pendingEvaluations, pendingLogs] = await Promise.all([
      this.evaluationService.myPendingEvaluations(user).catch(() => ({ data: [] as any[] })),
      trainer
        ? this.prisma.clinicalCaseLog.findMany({
            where: { trainerProfileId: trainer.id, status: { in: ['submitted', 'modification_requested'] } },
            include: { traineeProfile: { include: { person: true } } },
            orderBy: { performedAt: 'desc' },
            take: 20,
          })
        : [],
    ]);

    return {
      data: {
        evaluations: (pendingEvaluations as any)?.data ?? [],
        clinicalLogs: pendingLogs,
      },
    };
  }

  /**
   * Trainee detail drawer for a trainer — full picture of one trainee, scoped
   * to only the trainees currently assigned to the calling trainer. Reuses the
   * same reads as the trainee's own dashboard; the only new thing is the scope
   * check, which is the actual security boundary here (traineeId is a URL
   * param and must not by itself grant access).
   */
  @Get('trainer/trainee/:id')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner')
  async trainerTraineeDetail(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    const isPlainTrainer =
      user.roles.includes('trainer') &&
      !user.roles.includes('training_supervisor') &&
      !user.roles.includes('org_manager') &&
      !user.roles.includes('platform_owner');
    if (isPlainTrainer) {
      const trainer = await this.myTrainer(user);
      const assigned =
        trainer &&
        ((await this.prisma.traineeAllocation.findFirst({
          where: { traineeProfileId: id, trainerProfileId: trainer.id, status: 'open' },
        })) ||
          (await this.prisma.rotation.findFirst({
            where: { traineeProfileId: id, trainerProfileId: trainer.id, status: { in: ['scheduled', 'active'] } },
          })));
      if (!assigned) throw new BadRequestException('هذا المتدرب غير مسند إليك');
    }

    const profile = await this.prisma.traineeProfile.findUnique({
      where: { id },
      include: { person: true, organization: true, program: true },
    });
    if (!profile) return { data: null };

    const [attendance, rotation, tasks, clinicalLogs, competencies, evaluations] = await Promise.all([
      this.prisma.attendance.findMany({ where: { traineeProfileId: id }, orderBy: { date: 'desc' }, take: 31 }),
      this.prisma.rotation.findFirst({ where: { traineeProfileId: id, status: 'active' }, include: { department: true, trainerProfile: { include: { person: true } } } }),
      this.prisma.task.findMany({ where: { assignedTo: { personId: profile.personId } }, orderBy: { dueDate: 'asc' }, take: 20 }),
      this.prisma.clinicalCaseLog.findMany({ where: { traineeProfileId: id }, orderBy: { performedAt: 'desc' }, take: 20 }),
      this.prisma.competencyProgress.findMany({ where: { traineeProfileId: id }, include: { procedure: true } }),
      this.prisma.evaluation.findMany({ where: { evaluatee: { personId: profile.personId } }, orderBy: { submittedAt: 'desc' }, take: 10 }),
    ]);

    const present = attendance.filter((a) => a.status === 'present').length;
    return {
      data: {
        profile,
        rotation,
        attendance,
        attendanceToday: attendance.find((a) => new Date(a.date).toDateString() === new Date().toDateString()) ?? null,
        attendanceRate: attendance.length ? Math.round((present / attendance.length) * 100) : 0,
        tasks,
        clinicalLogs,
        competencies,
        evaluations,
      },
    };
  }

  @Get('trainee/dashboard')
  @RequireRoles('trainee', 'platform_owner', 'org_manager')
  async traineeDashboard(@CurrentUser() user: IAuthenticatedUser) {
    const profile = await this.myTrainee(user);
    if (!profile) return { data: null };
    const [attendance, logbook, approvedLogbook, competencies, evaluations, tasks, notifications, rotation] = await Promise.all([
      this.prisma.attendance.findMany({ where: { traineeProfileId: profile.id }, orderBy: { date: 'desc' }, take: 31 }),
      this.prisma.clinicalCaseLog.count({ where: { traineeProfileId: profile.id } }),
      this.prisma.clinicalCaseLog.count({ where: { traineeProfileId: profile.id, status: { in: ['trainer_approved', 'academic_approved', 'completed'] } } }),
      this.prisma.competencyProgress.findMany({ where: { traineeProfileId: profile.id }, include: { procedure: true } }),
      this.prisma.evaluation.findMany({ where: { evaluatee: { personId: profile.personId } }, orderBy: { submittedAt: 'desc' }, take: 5, include: { form: true } }),
      this.prisma.task.findMany({ where: { assignedTo: { personId: profile.personId }, status: { not: 'completed' } }, orderBy: { dueDate: 'asc' }, take: 10 }),
      this.prisma.notification.findMany({ where: { user: { personId: profile.personId } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.rotation.findFirst({ where: { traineeProfileId: profile.id, status: 'active' }, include: { department: true, trainerProfile: { include: { person: true } } } }),
    ]);
    const present = attendance.filter((a) => a.status === 'present').length;
    const required = competencies.reduce((sum, c) => sum + c.requiredCount, 0);
    const completed = competencies.reduce((sum, c) => sum + c.completedCount, 0);
    // Progress and readiness come from the timeline rather than being recomputed
    // here, so this dashboard cannot disagree with the hospital or cluster view.
    const { data: timeline } = await this.timelineService.getTraineeTimeline(profile.id);
    return {
      data: {
        profile,
        rotation,
        timeline,
        completionPercentage: timeline.completionPercentage,
        graduationProgress: timeline.graduationProgress,
        readiness: timeline.readiness,
        attendanceRate: attendance.length ? Math.round((present / attendance.length) * 100) : 0,
        logbook: { total: logbook, approved: approvedLogbook, pending: logbook - approvedLogbook },
        competencies: { required, completed, percentage: required ? Math.round((completed / required) * 100) : 0, data: competencies },
        evaluations,
        tasks,
        notifications,
      },
    };
  }

  @Get('attendance')
  @RequireCapability(
    CAPABILITIES.TRAINEE_VIEW_SCOPE, CAPABILITIES.TRAINEE_VIEW_HOSPITAL,
    CAPABILITIES.TRAINEE_VIEW_DEPARTMENT, CAPABILITIES.TRAINEE_VIEW_ASSIGNED,
    CAPABILITIES.SELF_VIEW,
  )
  async attendance(@CurrentUser() user: IAuthenticatedUser, @Query('traineeId') traineeId?: string) {
    const profile = traineeId ? null : await this.myTrainee(user);
    const data = await this.prisma.attendance.findMany({
      where: { organizationId: user.organizationId, ...(traineeId || profile ? { traineeProfileId: traineeId || profile?.id } : {}) },
      include: { traineeProfile: { include: { person: true } }, shift: true, approvedBy: { include: { person: true } } },
      orderBy: { date: 'desc' },
      take: 100,
    });
    return { data };
  }

  @Post('attendance/gps')
  @RequireRoles('trainee')
  async gpsAttendance(@CurrentUser() user: IAuthenticatedUser, @Body() dto: { lat: number; lng: number; shiftId?: string }) {
    // Geofencing: validate trainee is within allowed radius of their assigned hospital
    const profile = await this.prisma.traineeProfile.findFirst({
      where: { personId: user.personId },
      include: { organization: true },
    });
    if (profile?.organization?.geoLat && profile?.organization?.geoLng) {
      const orgLat = Number(profile.organization.geoLat);
      const orgLng = Number(profile.organization.geoLng);
      const radiusSetting = await this.prisma.setting.findFirst({
        where: { organizationId: profile.organizationId, key: 'gps_attendance_radius_meters' },
      });
      const allowedRadius = radiusSetting ? Number((radiusSetting.value as any)) : 500;
      const distance = haversineMeters(dto.lat, dto.lng, orgLat, orgLng);
      if (distance > allowedRadius) {
        throw new BadRequestException(`أنت خارج نطاق تسجيل الحضور. المسافة: ${Math.round(distance)} متر، الحد الأقصى: ${allowedRadius} متر`);
      }
    }
    return this.createAttendance(user, { method: 'gps', geoLat: dto.lat, geoLng: dto.lng, shiftId: dto.shiftId });
  }

  @Post('attendance/qr')
  @RequireRoles('trainee')
  async qrAttendance(@CurrentUser() user: IAuthenticatedUser, @Body() dto: { qrCode: string; shiftId?: string }) {
    // Validate scanned QR matches trainee's issued card QR payload
    const profile = await this.prisma.traineeProfile.findFirst({ where: { personId: user.personId } });
    if (profile?.cardUuid) {
      // Accept either the raw cardUuid or a JSON payload containing it
      const isValid = dto.qrCode === profile.cardUuid ||
        (() => { try { return JSON.parse(dto.qrCode)?.uuid === profile.cardUuid; } catch { return false; } })();
      if (!isValid) {
        throw new BadRequestException('رمز QR غير صحيح أو لا يطابق بطاقتك');
      }
    }
    return this.createAttendance(user, { method: 'qr', shiftId: dto.shiftId });
  }

  @Patch('attendance/:id/check-out')
  @RequireRoles('trainee')
  async checkOut(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    const profile = await this.myTrainee(user);
    const existing = await this.prisma.attendance.findFirst({ where: { id, traineeProfileId: profile?.id } });
    if (!existing) throw new BadRequestException('سجل الحضور غير موجود');
    if (!existing.checkIn) throw new BadRequestException('لا يمكن تسجيل الانصراف قبل تسجيل الحضور');
    if (existing.checkOut) throw new BadRequestException('تم تسجيل الانصراف مسبقاً لهذا اليوم');
    const data = await this.prisma.attendance.update({ where: { id }, data: { checkOut: new Date() } });
    return { success: true, data };
  }

  @Patch('attendance/:id/approve')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner')
  async approveAttendance(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    const data = await this.prisma.attendance.update({ where: { id }, data: { status: 'present', approvedById: user.accountId } });
    await this.audit(user, 'attendance.approve', 'Attendance', id, data);
    return { success: true, data };
  }

  @Patch('attendance/:id/reject')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner')
  async rejectAttendance(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser, @Body() dto: { reason?: string }) {
    const data = await this.prisma.attendance.update({ where: { id }, data: { status: 'rejected', excuseReason: dto.reason, approvedById: user.accountId } });
    await this.audit(user, 'attendance.reject', 'Attendance', id, data);
    return { success: true, data };
  }

  @Post('attendance/:id/correction-request')
  @RequireRoles('trainee')
  async correctionRequest(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser, @Body() dto: { reason: string }) {
    const data = await this.prisma.attendance.update({ where: { id }, data: { status: 'correction_requested', excuseReason: dto.reason } });
    await this.audit(user, 'attendance.correction_request', 'Attendance', id, data);
    return { success: true, data };
  }

  @Get('evaluations')
  @RequireCapability(
    CAPABILITIES.EVALUATION_SUBMIT, CAPABILITIES.TRAINEE_VIEW_SCOPE,
    CAPABILITIES.TRAINEE_VIEW_HOSPITAL, CAPABILITIES.SELF_VIEW,
  )
  async evaluations(@CurrentUser() user: IAuthenticatedUser) {
    const data = await this.prisma.evaluation.findMany({
      where: { organizationId: user.organizationId },
      include: { form: true, evaluator: { include: { person: true } }, evaluatee: { include: { person: true } }, rotation: { include: { department: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    });
    return { data };
  }

  @Get('evaluations/forms')
  async evaluationForms(@CurrentUser() user: IAuthenticatedUser) {
    const data = await this.prisma.evaluationForm.findMany({ where: { organizationId: user.organizationId, isActive: true }, orderBy: { formType: 'asc' } });
    return { data };
  }

  // ── POST /operations/evaluations  — trainer submits evaluation with all guards ──
  @Post('evaluations')
  @RequireRoles('trainer', 'academic_supervisor', 'training_supervisor', 'org_manager', 'platform_owner')
  @ApiOperation({ summary: 'إرسال تقييم المدرب للمتدرب — مع تطبيق القفل المتبادل وحارس اجتماع منتصف الدورة' })
  async createEvaluation(@CurrentUser() user: IAuthenticatedUser, @Body() dto: any) {
    return this.evaluationService.submitTrainerEvaluation(dto, user);
  }

  // ── POST /operations/evaluations/department  — trainee rates dept (anonymous) ──
  @Post('evaluations/department')
  @RequireRoles('trainee')
  @ApiOperation({ summary: 'تقييم المتدرب للقسم — مجهول الهوية تجاه القسم، ظاهر للشؤون الأكاديمية فقط' })
  async submitDepartmentEvaluation(@CurrentUser() user: IAuthenticatedUser, @Body() dto: any) {
    return this.evaluationService.submitDepartmentEvaluation(dto, user);
  }

  // ── GET /operations/evaluations/midpoint/:rotationId  — midpoint meeting status ──
  @Get('evaluations/midpoint/:rotationId')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner', 'trainee')
  @ApiOperation({ summary: 'حالة اجتماع منتصف الدورة للروتيشن' })
  async midpointStatus(@Param('rotationId') rotationId: string) {
    return this.evaluationService.midpointStatus(rotationId);
  }

  // ── PATCH /operations/evaluations/midpoint/:rotationId/complete  — record meeting ──
  @Patch('evaluations/midpoint/:rotationId/complete')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner')
  @ApiOperation({ summary: 'تسجيل اجتماع منتصف الدورة كمكتمل — شرط مسبق للتقييم النهائي' })
  async completeMidpointMeeting(
    @Param('rotationId') rotationId: string,
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: { notes?: string },
  ) {
    return this.evaluationService.completeMidpointMeeting(rotationId, dto.notes, user);
  }

  // ── GET /operations/evaluations/mutual-lock — mutual lock status ──────────
  @Get('evaluations/mutual-lock')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner', 'trainee')
  @ApiOperation({ summary: 'حالة القفل المتبادل للتقييم — كلا الطرفين يجب أن يكمل تقييمه' })
  async mutualLockStatus(
    @Query('rotationId') rotationId: string,
    @Query('traineeAccountId') traineeAccountId: string,
  ) {
    return this.evaluationService.mutualLockStatus(rotationId, traineeAccountId);
  }

  // ── GET /operations/evaluations/slow-evaluators  — academic supervisor report ──
  @Get('evaluations/slow-evaluators')
  @RequireRoles('trainer', 'training_supervisor', 'hospital_training_admin', 'cluster_administrator', 'training_director', 'academic_supervisor', 'org_manager', 'platform_owner')
  @ApiOperation({ summary: 'تقرير كاشف التقييم الآلي — المدربون الذين أرسلوا تقييمات مشبوهة (أقل من 40 ثانية)' })
  async slowEvaluators(@CurrentUser() user: IAuthenticatedUser) {
    return this.evaluationService.slowEvaluatorReport(user.organizationId);
  }

  // ── GET /operations/evaluations/my-pending  — trainee/trainer pending evals ────
  @Get('evaluations/my-pending')
  @RequireRoles('trainee', 'trainer', 'training_supervisor', 'hospital_training_admin', 'cluster_administrator', 'training_director', 'platform_owner', 'org_manager')
  @ApiOperation({ summary: 'التقييمات المعلقة للمتدرب أو المدرب — التقييمات التي تنتظر الإكمال' })
  async myPendingEvaluations(@CurrentUser() user: IAuthenticatedUser) {
    return this.evaluationService.myPendingEvaluations(user);
  }

  @Get('tasks')
  async tasks(@CurrentUser() user: IAuthenticatedUser) {
    const data = await this.prisma.task.findMany({
      where: { organizationId: user.organizationId, assignedToId: user.accountId },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
    return { data };
  }

  @Post('tasks')
  @RequireRoles('trainer', 'training_supervisor', 'org_manager', 'platform_owner')
  async createTask(@CurrentUser() user: IAuthenticatedUser, @Body() dto: any) {
    // A plain trainer may only assign tasks to a trainee currently assigned to
    // them — otherwise nothing stopped dto.assignedToId from naming any account
    // on the platform.
    const isPlainTrainer =
      user.roles.includes('trainer') &&
      !user.roles.includes('training_supervisor') &&
      !user.roles.includes('org_manager') &&
      !user.roles.includes('platform_owner');
    if (isPlainTrainer) {
      const trainer = await this.myTrainer(user);
      const targetProfile = await this.prisma.traineeProfile.findFirst({
        where: { person: { userAccounts: { some: { id: dto.assignedToId } } } },
      });
      const assigned =
        trainer && targetProfile
          ? (await this.prisma.traineeAllocation.findFirst({
              where: { traineeProfileId: targetProfile.id, trainerProfileId: trainer.id, status: 'open' },
            })) ||
            (await this.prisma.rotation.findFirst({
              where: { traineeProfileId: targetProfile.id, trainerProfileId: trainer.id, status: { in: ['scheduled', 'active'] } },
            }))
          : null;
      if (!assigned) {
        throw new BadRequestException('لا يمكن إسناد مهمة لمتدرب غير مسند إليك');
      }
    }

    const data = await this.prisma.task.create({
      data: {
        organizationId: user.organizationId,
        assignedToId: dto.assignedToId,
        assignedById: user.accountId,
        titleAr: dto.titleAr,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        priority: dto.priority,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
      },
    });
    await this.notify(user.organizationId, dto.assignedToId, dto.titleAr, dto.description || '', 'task', 'Task', data.id);
    return { success: true, data };
  }

  @Patch('tasks/:id/complete')
  async completeTask(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    const data = await this.prisma.task.update({ where: { id }, data: { status: 'completed', completedAt: new Date() } });
    await this.audit(user, 'task.complete', 'Task', id, data);
    return { success: true, data };
  }

  @Get('analytics')
  @RequireCapability(CAPABILITIES.REPORT_VIEW, CAPABILITIES.TRAINEE_VIEW_HOSPITAL)
  async analytics(@CurrentUser() user: IAuthenticatedUser, @Query('scope') scope = 'hospital') {
    const organizationId = user.organizationId;
    const [trainees, trainers, rotations, attendance, cases, evaluations, calls] = await Promise.all([
      this.prisma.traineeProfile.count({ where: { organizationId } }),
      this.prisma.trainerProfile.count({ where: { organizationId } }),
      this.prisma.rotation.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.attendance.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.clinicalCaseLog.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.evaluation.aggregate({ where: { organizationId }, _avg: { totalScore: true }, _count: true }),
      this.prisma.trainerCall.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
    ]);
    return { data: { scope, trainees, trainers, rotations, attendance, logbook: cases, evaluations, calls } };
  }

  @Get('calendar')
  @RequireCapability(
    CAPABILITIES.TRAINEE_VIEW_HOSPITAL, CAPABILITIES.TRAINEE_VIEW_ASSIGNED,
    CAPABILITIES.SELF_VIEW,
  )
  async calendar(@CurrentUser() user: IAuthenticatedUser) {
    const [rotations, shifts, tasks] = await Promise.all([
      this.prisma.rotation.findMany({ where: { organizationId: user.organizationId }, include: { department: true, traineeProfile: { include: { person: true } } }, take: 100 }),
      this.prisma.shift.findMany({ where: { organizationId: user.organizationId }, include: { department: true, traineeProfile: { include: { person: true } } }, take: 100 }),
      this.prisma.task.findMany({ where: { organizationId: user.organizationId, assignedToId: user.accountId }, take: 100 }),
    ]);
    return { data: { rotations, shifts, tasks } };
  }

  @Post('notifications/register-device')
  async registerDevice(@CurrentUser() user: IAuthenticatedUser, @Body() dto: any) {
    const data = await this.prisma.setting.upsert({
      where: { organizationId_key: { organizationId: user.organizationId, key: `push_device:${user.accountId}:${dto.deviceId}` } },
      create: { organizationId: user.organizationId, key: `push_device:${user.accountId}:${dto.deviceId}`, value: dto as Prisma.InputJsonValue, updatedById: user.accountId },
      update: { value: dto as Prisma.InputJsonValue, updatedById: user.accountId },
    });
    return { success: true, data };
  }

  private async createAttendance(user: IAuthenticatedUser, data: any) {
    const profile = await this.myTrainee(user);
    if (!profile) return { success: false, message: 'لا يوجد ملف متدرب' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await this.prisma.attendance.findFirst({ where: { traineeProfileId: profile.id, date: today } });
    if (existing?.checkIn && !existing.checkOut) {
      throw new BadRequestException('تم تسجيل حضورك اليوم بالفعل — لا يمكن تسجيل الحضور مرتين');
    }
    const attendance = existing
      ? await this.prisma.attendance.update({ where: { id: existing.id }, data: { checkIn: new Date(), status: 'present', ...data } })
      : await this.prisma.attendance.create({ data: { organizationId: user.organizationId, traineeProfileId: profile.id, date: today, checkIn: new Date(), status: 'present', ...data } });
    await this.audit(user, `attendance.${data.method}`, 'Attendance', attendance.id, attendance);
    return { success: true, data: attendance };
  }

  private myTrainee(user: IAuthenticatedUser) {
    return this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
      include: { person: true, organization: true, program: true },
    });
  }

  private myTrainer(user: IAuthenticatedUser) {
    return this.prisma.trainerProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
      include: { person: true, department: true },
    });
  }

  private audit(user: IAuthenticatedUser, action: string, entityType: string, entityId: string, data: unknown) {
    return this.prisma.auditLog.create({
      data: { organizationId: user.organizationId, actorId: user.accountId, action, entityType, entityId, newValues: data as Prisma.InputJsonValue },
    });
  }

  private notify(organizationId: string, userId: string, titleAr: string, bodyAr: string, type: string, referenceType: string, referenceId: string) {
    return this.prisma.notification.create({
      data: { organizationId, userId, titleAr, bodyAr, type, referenceType, referenceId, sentVia: 'in_app' },
    });
  }
}
