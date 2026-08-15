import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ConflictEngineService, ProposedSession } from './conflict-engine.service';
import { IAuthenticatedUser } from '../../common/interfaces';

export interface CreateScheduleDto {
  titleAr: string;
  titleEn?: string;
  departmentId?: string;
  traineeProfileIds: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  notes?: string;
  sessions?: Array<{
    date: string;
    startTime: string;
    endTime: string;
    departmentId: string;
    trainerProfileId?: string;
    traineeProfileId?: string;
    sessionType?: string;
    shiftType?: string;
    location?: string;
    capacity?: number;
    notes?: string;
  }>;
}

export interface UpdateScheduleDto {
  titleAr?: string;
  titleEn?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  status?: string;
  sessions?: Array<{
    id?: string;
    date: string;
    startTime: string;
    endTime: string;
    departmentId: string;
    trainerProfileId?: string;
    traineeProfileId?: string;
    sessionType?: string;
    shiftType?: string;
    location?: string;
    capacity?: number;
    notes?: string;
  }>;
}

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private conflictEngine: ConflictEngineService,
  ) {}

  /**
   * Find schedules scoped to the user's hospital organization.
   * Trainers only see schedules for their assigned trainees or schedules they created.
   * Trainees only see schedules where they are participants.
   */
  async findAll(user: IAuthenticatedUser, query?: { status?: string; traineeId?: string; departmentId?: string }) {
    const orgId = user.organizationId;
    const isTrainee = user.roles.includes('trainee');
    const isTrainer = user.roles.includes('trainer') && !user.roles.some((r) => ['hospital_training_admin', 'org_manager', 'platform_owner'].includes(r));

    let whereClause: any = { organizationId: orgId };

    if (query?.status) whereClause.status = query.status;
    if (query?.departmentId) whereClause.departmentId = query.departmentId;

    if (isTrainee) {
      const traineeProfile = await this.prisma.traineeProfile.findFirst({
        where: { person: { userAccounts: { some: { id: user.accountId } } } },
      });
      if (!traineeProfile) return { data: [] };
      whereClause.participants = { some: { traineeProfileId: traineeProfile.id } };
      whereClause.status = 'published'; // Trainees only see published schedules
    } else if (isTrainer) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { person: { userAccounts: { some: { id: user.accountId } } } },
      });
      if (!trainer) return { data: [] };
      whereClause.OR = [
        { createdById: user.accountId },
        { sessions: { some: { trainerProfileId: trainer.id } } },
      ];
    }

    if (query?.traineeId) {
      whereClause.participants = { some: { traineeProfileId: query.traineeId } };
    }

    const schedules = await this.prisma.trainingSchedule.findMany({
      where: whereClause,
      include: {
        department: true,
        createdBy: { select: { id: true, person: { select: { nameAr: true, email: true } } } },
        participants: { include: { traineeProfile: { include: { person: true } } } },
        sessions: {
          include: {
            department: true,
            trainerProfile: { include: { person: true } },
            traineeProfile: { include: { person: true } },
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
        revisions: { orderBy: { revision: 'desc' }, take: 1 },
      },
      orderBy: { startDate: 'desc' },
    });

    return { data: schedules };
  }

  async findOne(id: string, user: IAuthenticatedUser) {
    const schedule = await this.prisma.trainingSchedule.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        department: true,
        createdBy: { select: { id: true, person: { select: { nameAr: true, email: true } } } },
        participants: { include: { traineeProfile: { include: { person: true } } } },
        sessions: {
          include: {
            department: true,
            trainerProfile: { include: { person: true } },
            traineeProfile: { include: { person: true } },
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
        revisions: { orderBy: { revision: 'desc' } },
      },
    });

    if (!schedule) throw new NotFoundException('الجدول التدريبي غير موجود');
    return { data: schedule };
  }

  /**
   * Wizard & Quick Create Schedule
   */
  async create(user: IAuthenticatedUser, dto: CreateScheduleDto) {
    const orgId = user.organizationId;

    if (!dto.traineeProfileIds || dto.traineeProfileIds.length === 0) {
      throw new BadRequestException('يجب تحديد متدرب واحد على الأقل للجدول');
    }

    // Convert proposed sessions to ConflictEngine format
    const proposed: ProposedSession[] = (dto.sessions || []).map((s) => ({
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      departmentId: s.departmentId || dto.departmentId || '',
      trainerProfileId: s.trainerProfileId,
      traineeProfileIds: s.traineeProfileId ? [s.traineeProfileId] : dto.traineeProfileIds,
      sessionType: s.sessionType,
      shiftType: s.shiftType,
    }));

    // Pre-validate conflicts
    const conflictCheck = await this.conflictEngine.validateSessions(orgId, proposed);
    if (conflictCheck.hasConflict) {
      throw new ConflictException({
        message: 'يوجد تعارض في بيانات الجلسات المحددة',
        conflicts: conflictCheck.conflicts,
      });
    }

    // Calculate total hours
    const totalHours = (dto.sessions || []).reduce((acc, s) => {
      const [h1, m1] = s.startTime.split(':').map(Number);
      const [h2, m2] = s.endTime.split(':').map(Number);
      const diff = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
      return acc + (diff > 0 ? diff : 0);
    }, 0);

    const schedule = await this.prisma.$transaction(async (tx) => {
      const sched = await tx.trainingSchedule.create({
        data: {
          organizationId: orgId,
          departmentId: dto.departmentId,
          titleAr: dto.titleAr,
          titleEn: dto.titleEn,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          status: 'draft',
          totalHours: Math.round(totalHours),
          notes: dto.notes,
          createdById: user.accountId,
          participants: {
            create: dto.traineeProfileIds.map((tid) => ({ traineeProfileId: tid })),
          },
        },
      });

      if (dto.sessions && dto.sessions.length > 0) {
        await tx.scheduleSession.createMany({
          data: dto.sessions.map((s) => {
            const [h1, m1] = s.startTime.split(':').map(Number);
            const [h2, m2] = s.endTime.split(':').map(Number);
            const durationHours = Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);

            return {
              scheduleId: sched.id,
              organizationId: orgId,
              departmentId: s.departmentId || dto.departmentId || '',
              trainerProfileId: s.trainerProfileId,
              traineeProfileId: s.traineeProfileId || dto.traineeProfileIds[0],
              date: new Date(s.date),
              startTime: s.startTime,
              endTime: s.endTime,
              durationHours: new Prisma.Decimal(durationHours),
              sessionType: s.sessionType || 'clinical_round',
              shiftType: s.shiftType || 'morning',
              location: s.location,
              capacity: s.capacity || 1,
              notes: s.notes,
            };
          }),
        });
      }

      return sched;
    });

    return this.findOne(schedule.id, user);
  }

  /**
   * Update Schedule / Drag & Drop Session update
   */
  async update(id: string, user: IAuthenticatedUser, dto: UpdateScheduleDto) {
    const existing = await this.prisma.trainingSchedule.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { participants: true },
    });
    if (!existing) throw new NotFoundException('الجدول التدريبي غير موجود');

    // If updating sessions, check conflicts
    if (dto.sessions && dto.sessions.length > 0) {
      const traineeIds = existing.participants.map((p) => p.traineeProfileId);
      const proposed: ProposedSession[] = dto.sessions.map((s) => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        departmentId: s.departmentId || existing.departmentId || '',
        trainerProfileId: s.trainerProfileId,
        traineeProfileIds: s.traineeProfileId ? [s.traineeProfileId] : traineeIds,
        sessionType: s.sessionType,
        shiftType: s.shiftType,
      }));

      const conflictCheck = await this.conflictEngine.validateSessions(user.organizationId, proposed, undefined, id);
      if (conflictCheck.hasConflict) {
        throw new ConflictException({
          message: 'تعارض في بيانات الجلسات المحدثة',
          conflicts: conflictCheck.conflicts,
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.trainingSchedule.update({
        where: { id },
        data: {
          titleAr: dto.titleAr,
          titleEn: dto.titleEn,
          departmentId: dto.departmentId,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          status: dto.status,
          notes: dto.notes,
          updatedById: user.accountId,
        },
      });

      if (dto.sessions) {
        // Upsert sessions
        for (const s of dto.sessions) {
          const [h1, m1] = s.startTime.split(':').map(Number);
          const [h2, m2] = s.endTime.split(':').map(Number);
          const durationHours = Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);

          if (s.id) {
            await tx.scheduleSession.update({
              where: { id: s.id },
              data: {
                date: new Date(s.date),
                startTime: s.startTime,
                endTime: s.endTime,
                departmentId: s.departmentId,
                trainerProfileId: s.trainerProfileId,
                traineeProfileId: s.traineeProfileId,
                sessionType: s.sessionType,
                shiftType: s.shiftType,
                location: s.location,
                durationHours: new Prisma.Decimal(durationHours),
                notes: s.notes,
              },
            });
          } else {
            await tx.scheduleSession.create({
              data: {
                scheduleId: id,
                organizationId: user.organizationId,
                departmentId: s.departmentId || existing.departmentId || '',
                trainerProfileId: s.trainerProfileId,
                traineeProfileId: s.traineeProfileId || existing.participants[0]?.traineeProfileId,
                date: new Date(s.date),
                startTime: s.startTime,
                endTime: s.endTime,
                durationHours: new Prisma.Decimal(durationHours),
                sessionType: s.sessionType || 'clinical_round',
                shiftType: s.shiftType || 'morning',
                location: s.location,
                capacity: s.capacity || 1,
                notes: s.notes,
              },
            });
          }
        }
      }
    });

    return this.findOne(id, user);
  }

  /**
   * Check conflicts endpoint (for Frontend live pre-checking)
   */
  async checkConflicts(user: IAuthenticatedUser, body: { sessions: ProposedSession[]; scheduleId?: string }) {
    return this.conflictEngine.validateSessions(user.organizationId, body.sessions, undefined, body.scheduleId);
  }

  /**
   * Publish Schedule: Transitions to published, creates Revision Snapshot, and generates Shifts / Notifications (Idempotently)
   */
  async publish(id: string, user: IAuthenticatedUser, changeReason?: string) {
    const canPublish = user.roles.some((r) => ['hospital_training_admin', 'org_manager', 'platform_owner'].includes(r));
    if (!canPublish) {
      throw new ForbiddenException('صلاحية النشر النهائي للجدول محصورة لإدارة التدريب بالمستشفى');
    }

    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.trainingSchedule.findFirst({
        where: { id, organizationId: user.organizationId },
        include: {
          sessions: { include: { department: true, trainerProfile: true, traineeProfile: true } },
          participants: { include: { traineeProfile: { include: { person: true } } } },
          revisions: { orderBy: { revision: 'desc' }, take: 1 },
        },
      });

      if (!schedule) throw new NotFoundException('الجدول التدريبي غير موجود');

      if (!schedule.sessions || schedule.sessions.length === 0) {
        throw new BadRequestException('لا يمكن نشر جدول تدريبي لا يحتوي على أي جلسات أو مناوبات تدريبية');
      }

      // Re-check conflicts inside current transaction
      const proposed: ProposedSession[] = schedule.sessions.map((s) => ({
        date: new Date(s.date).toISOString().slice(0, 10),
        startTime: s.startTime,
        endTime: s.endTime,
        departmentId: s.departmentId,
        trainerProfileId: s.trainerProfileId,
        traineeProfileIds: s.traineeProfileId
          ? [s.traineeProfileId]
          : schedule.participants.map((p) => p.traineeProfileId),
      }));

      const conflictCheck = await this.conflictEngine.validateSessions(user.organizationId, proposed, tx, id);
      if (conflictCheck.hasConflict) {
        throw new ConflictException({
          message: 'لا يمكن نشر الجدول لوجود تعارضات حافلة في أوقات الجلسات أو السعة',
          conflicts: conflictCheck.conflicts,
        });
      }

      // 1. Idempotently generate Shift records for trainees in sessions FIRST
      let generatedShiftsCount = 0;
      for (const session of schedule.sessions) {
        const traineeIds = session.traineeProfileId
          ? [session.traineeProfileId]
          : schedule.participants.map((p) => p.traineeProfileId);

        for (const tid of traineeIds) {
          const shiftDate = new Date(session.date);
          const existingShift = await tx.shift.findFirst({
            where: {
              organizationId: user.organizationId,
              traineeProfileId: tid,
              departmentId: session.departmentId,
              date: shiftDate,
              shiftType: session.shiftType,
            },
          });

          if (!existingShift) {
            await tx.shift.create({
              data: {
                organizationId: user.organizationId,
                traineeProfileId: tid,
                departmentId: session.departmentId,
                date: shiftDate,
                shiftType: session.shiftType,
                startTime: session.startTime,
                endTime: session.endTime,
                createdById: user.accountId,
              },
            });
            generatedShiftsCount++;
          }
        }
      }

      const nextRevision = (schedule.revisions[0]?.revision || 0) + 1;
      const snapshot = JSON.parse(JSON.stringify(schedule));

      // 2. Create Revision Snapshot
      await tx.scheduleRevision.create({
        data: {
          scheduleId: id,
          revision: nextRevision,
          snapshot: snapshot as Prisma.InputJsonValue,
          oldValues: schedule.revisions[0]?.snapshot || {},
          newValues: snapshot as Prisma.InputJsonValue,
          changeReason: changeReason || 'نشر وتحديث الجدول التدريبي',
          publishedById: user.accountId,
        },
      });

      // 3. Update Schedule Status to published ONLY after sessions/shifts validation
      await tx.trainingSchedule.update({
        where: { id },
        data: { status: 'published', updatedById: user.accountId },
      });

      // 4. Send notifications to participants
      for (const part of schedule.participants) {
        const traineeUser = await tx.userAccount.findFirst({
          where: { person: { traineeProfile: { id: part.traineeProfileId } } },
        });
        if (traineeUser) {
          await tx.notification.create({
            data: {
              organizationId: user.organizationId,
              userId: traineeUser.id,
              titleAr: 'تم نشر الجدول التدريبي الخاص بك',
              bodyAr: `تمت إضافة/تحديث جلساتك التدريبية في جدول: ${schedule.titleAr}`,
              type: 'schedule_published',
              referenceType: 'TrainingSchedule',
              referenceId: id,
            },
          });
        }
      }

      return { success: true, revision: nextRevision };
    });
  }

  /**
   * Delete session / schedule
   */
  async removeSession(sessionId: string, user: IAuthenticatedUser) {
    const session = await this.prisma.scheduleSession.findFirst({
      where: { id: sessionId, organizationId: user.organizationId },
    });
    if (!session) throw new NotFoundException('الجلسة غير موجودة');

    await this.prisma.scheduleSession.delete({ where: { id: sessionId } });
    return { success: true };
  }

  async remove(id: string, user: IAuthenticatedUser) {
    const schedule = await this.prisma.trainingSchedule.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!schedule) throw new NotFoundException('الجدول غير موجود');

    await this.prisma.trainingSchedule.delete({ where: { id } });
    return { success: true };
  }
}
