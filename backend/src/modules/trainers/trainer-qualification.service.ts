import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IAuthenticatedUser } from '../../common/interfaces';

/**
 * Trainer qualification — which training programs a trainer may supervise.
 *
 * This is the relational replacement for the free-text `specialization` field.
 * The allocation engine treats it as a hard constraint, so removing a
 * qualification a trainer is actively using is refused rather than silently
 * stranding trainees.
 */
@Injectable()
export class TrainerQualificationService {
  constructor(private prisma: PrismaService) {}

  /** Programs a trainer is qualified for, with their per-program load. */
  async listForTrainer(trainerProfileId: string) {
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { id: trainerProfileId },
      select: { id: true, organizationId: true, maxTrainees: true },
    });
    if (!trainer) throw new NotFoundException('المدرب غير موجود');

    const quals = await this.prisma.trainerProgram.findMany({
      where: { trainerProfileId },
      include: { program: { select: { id: true, code: true, nameAr: true, nameEn: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const data = await Promise.all(
      quals.map(async (q) => {
        const occupied = await this.prisma.rotation.count({
          where: { trainerProfileId, programId: q.programId, status: 'active' },
        });
        const capacity = q.maxTrainees ?? trainer.maxTrainees;
        return {
          id: q.id,
          programId: q.programId,
          program: q.program,
          isActive: q.isActive,
          capacity,
          occupied,
          available: Math.max(0, capacity - occupied),
        };
      }),
    );
    return { data };
  }

  /** Trainers in an organization qualified for a program. */
  async listQualifiedTrainers(organizationId: string, programId: string) {
    const data = await this.prisma.trainerProgram.findMany({
      where: {
        programId,
        isActive: true,
        trainerProfile: { organizationId, isActive: true },
      },
      include: {
        trainerProfile: {
          include: {
            person: { select: { nameAr: true, nameEn: true } },
            department: { select: { id: true, nameAr: true } },
          },
        },
      },
    });
    return { data };
  }

  async addQualification(
    trainerProfileId: string,
    dto: { programId: string; maxTrainees?: number },
    user: IAuthenticatedUser,
  ) {
    const trainer = await this.requireTrainerInScope(trainerProfileId, user);

    const program = await this.prisma.program.findFirst({
      where: { id: dto.programId, deletedAt: null, isActive: true },
      select: { id: true, nameAr: true },
    });
    if (!program) throw new NotFoundException('البرنامج التدريبي غير موجود في الكتالوج');

    const existing = await this.prisma.trainerProgram.findUnique({
      where: { trainerProfileId_programId: { trainerProfileId, programId: dto.programId } },
    });

    // Re-activating a previously removed qualification must not fail as a duplicate.
    const record = existing
      ? await this.prisma.trainerProgram.update({
          where: { id: existing.id },
          data: { isActive: true, maxTrainees: dto.maxTrainees ?? existing.maxTrainees, updatedById: user.accountId },
        })
      : await this.prisma.trainerProgram.create({
          data: {
            trainerProfileId,
            programId: dto.programId,
            maxTrainees: dto.maxTrainees,
            createdById: user.accountId,
          },
        });

    await this.audit(user, trainer.organizationId, 'add_trainer_qualification', record.id, null, {
      trainerProfileId,
      programId: dto.programId,
      programName: program.nameAr,
      maxTrainees: dto.maxTrainees ?? null,
    });

    return { data: record, success: true, message: `تم تأهيل المدرب لبرنامج ${program.nameAr}` };
  }

  async updateQualification(
    qualificationId: string,
    dto: { maxTrainees?: number; isActive?: boolean },
    user: IAuthenticatedUser,
  ) {
    const record = await this.prisma.trainerProgram.findUnique({
      where: { id: qualificationId },
      include: { program: { select: { nameAr: true } } },
    });
    if (!record) throw new NotFoundException('التأهيل غير موجود');
    const trainer = await this.requireTrainerInScope(record.trainerProfileId, user);

    // Deactivating, or cutting the cap, must not strand trainees already placed.
    if (dto.isActive === false || dto.maxTrainees !== undefined) {
      const active = await this.prisma.rotation.count({
        where: { trainerProfileId: record.trainerProfileId, programId: record.programId, status: 'active' },
      });
      if (dto.isActive === false && active > 0) {
        throw new BadRequestException(
          `لا يمكن إلغاء التأهيل — لدى المدرب حالياً ${active} روتيشن نشط في هذا البرنامج`,
        );
      }
      if (dto.maxTrainees !== undefined && dto.maxTrainees < active) {
        throw new BadRequestException(
          `لا يمكن ضبط السعة على ${dto.maxTrainees} — لدى المدرب حالياً ${active} روتيشن نشط في هذا البرنامج`,
        );
      }
    }

    const updated = await this.prisma.trainerProgram.update({
      where: { id: qualificationId },
      data: {
        ...(dto.maxTrainees !== undefined ? { maxTrainees: dto.maxTrainees } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedById: user.accountId,
      },
    });

    await this.audit(
      user, trainer.organizationId, 'update_trainer_qualification', qualificationId,
      { maxTrainees: record.maxTrainees, isActive: record.isActive },
      { maxTrainees: updated.maxTrainees, isActive: updated.isActive },
    );

    return { data: updated, success: true, message: 'تم تحديث تأهيل المدرب' };
  }

  async removeQualification(qualificationId: string, user: IAuthenticatedUser) {
    const record = await this.prisma.trainerProgram.findUnique({ where: { id: qualificationId } });
    if (!record) throw new NotFoundException('التأهيل غير موجود');
    const trainer = await this.requireTrainerInScope(record.trainerProfileId, user);

    const active = await this.prisma.rotation.count({
      where: { trainerProfileId: record.trainerProfileId, programId: record.programId, status: 'active' },
    });
    if (active > 0) {
      throw new BadRequestException(
        `لا يمكن حذف التأهيل — لدى المدرب حالياً ${active} روتيشن نشط في هذا البرنامج`,
      );
    }

    await this.prisma.trainerProgram.delete({ where: { id: qualificationId } });
    await this.audit(user, trainer.organizationId, 'remove_trainer_qualification', qualificationId, record, null);

    return { success: true, message: 'تم حذف تأهيل المدرب' };
  }

  private async requireTrainerInScope(trainerProfileId: string, user: IAuthenticatedUser) {
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { id: trainerProfileId },
      select: { id: true, organizationId: true },
    });
    if (!trainer) throw new NotFoundException('المدرب غير موجود');

    const isPlatform = user.roles?.some((r) => ['platform_owner', 'system_admin'].includes(r));
    if (!isPlatform && trainer.organizationId !== user.organizationId) {
      throw new ForbiddenException('لا يمكنك إدارة مدربي جهة أخرى');
    }
    return trainer;
  }

  private async audit(
    user: IAuthenticatedUser,
    organizationId: string,
    action: string,
    entityId: string,
    oldValues: unknown,
    newValues: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: user.accountId,
        action,
        entityType: 'TrainerProgram',
        entityId,
        oldValues: (oldValues ?? undefined) as object | undefined,
        newValues: (newValues ?? undefined) as object | undefined,
      },
    });
  }
}
