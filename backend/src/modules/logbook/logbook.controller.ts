import { Controller, Get, Post, Body, Param, Patch, Put, Query, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, RequireRoles } from '../../common/decorators';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Clinical Logbook & Competencies (السجل السريري وحقيبة الكفاءات)')
@Controller('logbook')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class LogbookController {
  constructor(private prisma: PrismaService) {}

  // ─── 1. مكتبة الإجراءات الطبية (Procedures Catalog) ──────────────────────
  @Get('procedures')
  @RequireRoles('trainee', 'trainer', 'academic_supervisor', 'org_manager', 'platform_owner')
  @ApiOperation({ summary: 'استعراض مكتبة الإجراءات والمهارات السريرية المتاحة' })
  async getProcedures(@Query('category') category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;

    const procedures = await this.prisma.procedureCatalog.findMany({
      where,
      orderBy: { category: 'asc' },
    });
    return { data: procedures };
  }

  @Post('procedures')
  @RequireRoles('org_manager', 'platform_owner', 'academic_supervisor')
  @ApiOperation({ summary: 'إضافة إجراء سريري جديد لمكتبة الإجراءات' })
  async createProcedure(@Body() dto: { code: string; titleAr: string; titleEn: string; category: string; minRequired?: number; descriptionAr?: string }) {
    const proc = await this.prisma.procedureCatalog.create({
      data: {
        code: dto.code,
        titleAr: dto.titleAr,
        titleEn: dto.titleEn,
        category: dto.category,
        minRequired: dto.minRequired || 5,
        descriptionAr: dto.descriptionAr,
      },
    });
    return { success: true, procedure: proc };
  }

  // ─── 2. سجل الحالات والإجراءات للمتدرب (Case & Procedure Logs) ─────────────
  @Get('my-logs')
  @RequireRoles('trainee', 'trainer', 'training_supervisor', 'hospital_training_admin', 'cluster_administrator', 'training_director', 'platform_owner', 'org_manager')
  @ApiOperation({ summary: 'عرض سجل الحالات والإجراءات الخاصة بالمتدرب الحالي أو المدرب/المشرف' })
  async getMyLogs(@CurrentUser() user: IAuthenticatedUser) {
    if (user.roles.includes('hospital_administrator')) {
      return { data: [] };
    }

    const isTrainee = user.roles.includes('trainee');
    const isTrainer = user.roles.includes('trainer');

    if (isTrainee) {
      const profile = await this.prisma.traineeProfile.findFirst({
        where: { person: { userAccounts: { some: { id: user.accountId } } } },
      });
      if (!profile) return { data: [] };

      const logs = await this.prisma.clinicalCaseLog.findMany({
        where: { traineeProfileId: profile.id },
        include: {
          procedure: true,
          department: true,
          trainerProfile: { include: { person: true } },
          signoffs: { include: { signer: { include: { person: true } } } },
        },
        orderBy: { performedAt: 'desc' },
      });
      return { data: logs };
    }

    if (isTrainer) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { person: { userAccounts: { some: { id: user.accountId } } } },
      });
      if (!trainer) return { data: [] };

      const logs = await this.prisma.clinicalCaseLog.findMany({
        where: {
          OR: [
            { trainerProfileId: trainer.id },
            { traineeProfile: { rotations: { some: { trainerProfileId: trainer.id } } } },
          ],
        },
        include: {
          traineeProfile: { include: { person: true } },
          procedure: true,
          department: true,
          trainerProfile: { include: { person: true } },
          signoffs: { include: { signer: { include: { person: true } } } },
        },
        orderBy: { performedAt: 'desc' },
      });
      return { data: logs };
    }

    // Supervisors and admins
    const logs = await this.prisma.clinicalCaseLog.findMany({
      where: { organizationId: user.organizationId },
      include: {
        traineeProfile: { include: { person: true } },
        procedure: true,
        department: true,
        trainerProfile: { include: { person: true } },
        signoffs: { include: { signer: { include: { person: true } } } },
      },
      orderBy: { performedAt: 'desc' },
    });
    return { data: logs };
  }

  @Get('trainee-logs/:traineeId')
  @RequireRoles('trainer', 'academic_supervisor', 'training_supervisor', 'hospital_training_admin', 'cluster_administrator', 'training_director', 'org_manager', 'platform_owner')
  @ApiOperation({ summary: 'عرض سجل الحالات لمتدرب محدد — للمدرب والمشرف الأكاديمي' })
  async getTraineeLogs(@Param('traineeId') traineeId: string) {
    const logs = await this.prisma.clinicalCaseLog.findMany({
      where: { traineeProfileId: traineeId },
      include: {
        procedure: true,
        department: true,
        trainerProfile: { include: { person: true } },
        signoffs: { include: { signer: { include: { person: true } } } },
      },
      orderBy: { performedAt: 'desc' },
    });

    return { data: logs };
  }

  @Post('entries')
  @RequireRoles('trainee', 'trainer', 'training_supervisor', 'hospital_training_admin', 'cluster_administrator', 'training_director', 'platform_owner', 'org_manager')
  @ApiOperation({ summary: 'تسجيل حالة سريرية أو إجراء طبي جديد' })
  async createLogEntry(@CurrentUser() user: IAuthenticatedUser, @Body() dto: {
    traineeProfileId?: string;
    diagnosis: string;
    procedureId?: string;
    patientAge?: number;
    patientGender?: string;
    specialtyAr?: string;
    complexity?: string;
    participationLevel?: string;
    notes?: string;
    evidenceUrls?: string[];
  }) {
    if (user.roles.includes('hospital_administrator')) {
      throw new ForbiddenException('غير مصرح لمدير المستشفى الإداري بالوصول إلى العمليات التدريبية');
    }

    const isTrainee = user.roles.includes('trainee');
    const isTrainer = user.roles.includes('trainer');

    let targetTraineeId: string | undefined = dto.traineeProfileId;
    let trainerProfileId: string | undefined;

    if (isTrainee) {
      const profile = await this.prisma.traineeProfile.findFirst({
        where: { person: { userAccounts: { some: { id: user.accountId } } } },
      });
      if (!profile) return { error: 'لا يوجد ملف متدرب مراد بالتسجيل عليه' };
      targetTraineeId = profile.id;
    } else if (isTrainer) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { person: { userAccounts: { some: { id: user.accountId } } } },
      });
      if (!trainer) throw new BadRequestException('لا يوجد ملف مدرب مرتبط بهذا الحساب');
      trainerProfileId = trainer.id;

      if (!targetTraineeId) {
        throw new BadRequestException('يرجى تحديد المتدرب المراد تسجيل الحالة له');
      }

      // Verify assignment guard
      const isAssigned = await this.prisma.traineeAllocation.findFirst({
        where: {
          traineeProfileId: targetTraineeId,
          trainerProfileId: trainer.id,
          status: 'open',
        },
      }) || await this.prisma.rotation.findFirst({
        where: {
          traineeProfileId: targetTraineeId,
          trainerProfileId: trainer.id,
          status: { in: ['scheduled', 'active'] },
        },
      });

      if (!isAssigned) {
        throw new ForbiddenException('غير مصرح للمدرب بإضافة حالة لمتدرب غير مسند إليه');
      }
    } else if (!targetTraineeId) {
      throw new BadRequestException('يرجى تحديد المتدرب المراد تسجيل الحالة له');
    }

    const profile = await this.prisma.traineeProfile.findUnique({
      where: { id: targetTraineeId },
    });
    if (!profile) return { error: 'ملف المتدرب غير موجود' };

    const activeRotation = await this.prisma.rotation.findFirst({
      where: { traineeProfileId: profile.id, status: 'active' },
    });

    const entry = await this.prisma.clinicalCaseLog.create({
      data: {
        organizationId: profile.organizationId,
        traineeProfileId: profile.id,
        trainerProfileId: activeRotation?.trainerProfileId,
        rotationId: activeRotation?.id,
        departmentId: activeRotation?.departmentId,
        procedureId: dto.procedureId,
        diagnosis: dto.diagnosis,
        patientAge: dto.patientAge,
        patientGender: dto.patientGender,
        specialtyAr: dto.specialtyAr,
        complexity: dto.complexity || 'medium',
        participationLevel: dto.participationLevel || 'performed',
        notes: dto.notes,
        evidenceUrls: dto.evidenceUrls || [],
        status: 'submitted',
        performedAt: new Date(),
      },
    });

    // تحديث نسبة الكفاءة والتقدم
    if (dto.procedureId) {
      const comp = await this.prisma.competencyProgress.findUnique({
        where: { traineeProfileId_procedureId: { traineeProfileId: profile.id, procedureId: dto.procedureId } },
      });
      if (comp) {
        const newCount = comp.completedCount + 1;
        await this.prisma.competencyProgress.update({
          where: { id: comp.id },
          data: {
            completedCount: newCount,
            status: newCount >= comp.requiredCount ? 'completed' : 'in_progress',
            lastUpdated: new Date(),
          },
        });
      } else {
        const proc = await this.prisma.procedureCatalog.findUnique({ where: { id: dto.procedureId } });
        await this.prisma.competencyProgress.create({
          data: {
            traineeProfileId: profile.id,
            procedureId: dto.procedureId,
            requiredCount: proc?.minRequired || 5,
            completedCount: 1,
            status: 1 >= (proc?.minRequired || 5) ? 'completed' : 'in_progress',
          },
        });
      }
    }

    return { success: true, entry };
  }

  @Get('cases')
  @RequireRoles('trainer', 'academic_supervisor', 'org_manager', 'platform_owner', 'training_supervisor', 'hospital_administrator', 'department_head', 'trainee')
  async getCases(@CurrentUser() user: IAuthenticatedUser) {
    const isTrainee = user.roles?.includes('trainee');
    const trainer = isTrainee ? null : await this.prisma.trainerProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });
    const traineeProfile = isTrainee ? await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    }) : null;
    const logs = await this.prisma.clinicalCaseLog.findMany({
      where: {
        organizationId: user.organizationId,
        ...(trainer ? { trainerProfileId: trainer.id } : {}),
        ...(traineeProfile ? { traineeProfileId: traineeProfile.id } : {}),
      },
      include: {
        traineeProfile: { include: { person: true } },
        procedure: true,
        department: true,
        trainerProfile: { include: { person: true } },
        signoffs: { include: { signer: { include: { person: true } } } },
      },
      orderBy: { performedAt: 'desc' },
    });
    return { data: logs };
  }

  @Post('cases')
  @RequireRoles('trainee', 'platform_owner', 'org_manager')
  async createCaseAlias(@CurrentUser() user: IAuthenticatedUser, @Body() dto: any) {
    return this.createLogEntry(user, dto);
  }

  // ─── 3. الاعتماد الإلكتروني (Digital Sign-off Workflow) ─────────────────────
  @Post('entries/:id/approve')
  @RequireRoles('trainer', 'academic_supervisor', 'org_manager', 'platform_owner')
  @ApiOperation({ summary: 'اعتماد حالة سريرية إلكترونياً من قبل المدرب أو المشرف الأكاديمي' })
  async approveLogEntry(
    @Param('id') logId: string,
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: { feedback?: string; signatureUrl?: string }
  ) {
    const isAcademic = user.roles.includes('academic_supervisor');
    const isTrainer = user.roles.includes('trainer') || user.roles.includes('org_manager') || user.roles.includes('platform_owner');

    const nextStatus = isAcademic ? 'completed' : 'trainer_approved';

    const previous = await this.prisma.clinicalCaseLog.findUnique({ where: { id: logId } });
    const updatedLog = await this.prisma.clinicalCaseLog.update({
      where: { id: logId },
      data: {
        status: nextStatus,
      },
    });

    await this.prisma.logbookSignoff.create({
      data: {
        caseLogId: logId,
        signerId: user.accountId,
        signerRole: isAcademic ? 'academic_supervisor' : 'trainer',
        signatureUrl: dto.signatureUrl,
        feedback: dto.feedback,
        signedAt: new Date(),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.accountId,
        action: 'logbook.approve',
        entityType: 'ClinicalCaseLog',
        entityId: logId,
        oldValues: previous ? { status: previous.status } : undefined,
        newValues: { status: nextStatus },
      },
    });

    return { success: true, log: updatedLog };
  }

  @Patch('entries/:id')
  @RequireRoles('trainee', 'platform_owner', 'org_manager')
  @ApiOperation({ summary: 'تعديل مسودة سجل سريري قبل الاعتماد' })
  async updateLogEntry(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser, @Body() dto: any) {
    const profile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });
    const previous = await this.prisma.clinicalCaseLog.findFirst({
      where: {
        id,
        ...(profile ? { traineeProfileId: profile.id } : { organizationId: user.organizationId }),
        status: { in: ['draft', 'submitted', 'modification_requested', 'rejected'] },
      },
    });
    if (!previous) return { success: false, message: 'لا يمكن تعديل هذا السجل' };
    const log = await this.prisma.clinicalCaseLog.update({
      where: { id },
      data: {
        diagnosis: dto.diagnosis,
        procedureId: dto.procedureId,
        patientAge: dto.patientAge,
        patientGender: dto.patientGender,
        specialtyAr: dto.specialtyAr,
        complexity: dto.complexity,
        participationLevel: dto.participationLevel,
        notes: dto.notes,
        evidenceUrls: dto.evidenceUrls,
        status: dto.status,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.accountId,
        action: 'logbook.update',
        entityType: 'ClinicalCaseLog',
        entityId: id,
        oldValues: { status: previous.status },
        newValues: { status: log.status },
      },
    });
    return { success: true, data: log };
  }

  @Patch('entries/:id/submit')
  @RequireRoles('trainee', 'platform_owner', 'org_manager')
  async submitLogEntry(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    return this.transitionLog(id, user, 'submitted', 'logbook.submit');
  }

  @Put('cases/:id/approve')
  @RequireRoles('trainer', 'academic_supervisor', 'org_manager', 'platform_owner')
  async approveCaseAlias(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    return this.approveLogEntry(id, user, {});
  }

  @Put('cases/:id/reject')
  @RequireRoles('trainer', 'academic_supervisor', 'org_manager', 'platform_owner')
  async rejectCaseAlias(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    return this.transitionLog(id, user, 'rejected', 'logbook.reject');
  }

  @Patch('entries/:id/reject')
  @RequireRoles('trainer', 'academic_supervisor', 'org_manager', 'platform_owner')
  async rejectLogEntry(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser, @Body() dto: { feedback?: string }) {
    const result = await this.transitionLog(id, user, 'rejected', 'logbook.reject');
    if (result.success && dto.feedback) {
      await this.prisma.logbookSignoff.create({
        data: { caseLogId: id, signerId: user.accountId, signerRole: user.roles[0] || 'reviewer', feedback: dto.feedback },
      });
    }
    return result;
  }

  @Patch('entries/:id/request-modification')
  @RequireRoles('trainer', 'academic_supervisor', 'org_manager', 'platform_owner')
  async requestModification(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser, @Body() dto: { feedback?: string }) {
    const result = await this.transitionLog(id, user, 'modification_requested', 'logbook.request_modification');
    if (result.success && dto.feedback) {
      await this.prisma.logbookSignoff.create({
        data: { caseLogId: id, signerId: user.accountId, signerRole: user.roles[0] || 'reviewer', feedback: dto.feedback },
      });
    }
    return result;
  }

  // ─── 4. حقيبة الكفاءات والتقدم (Competency Portfolio Progress) ───────────
  @Get('competencies')
  @RequireRoles('trainee', 'trainer', 'academic_supervisor', 'org_manager', 'platform_owner')
  @ApiOperation({ summary: 'عرض كفاءات وتقدم المتدرب ونسبة الإنجاز المطلوبة' })
  async getCompetencies(@CurrentUser() user: IAuthenticatedUser, @Query('traineeId') traineeId?: string) {
    let targetTraineeId = traineeId;

    if (!targetTraineeId) {
      const profile = await this.prisma.traineeProfile.findFirst({
        where: { person: { userAccounts: { some: { id: user.accountId } } } },
      });
      targetTraineeId = profile?.id;
    }

    if (!targetTraineeId) {
    }
    if (!targetTraineeId) return { data: [], overallPercentage: 0 };

    const competencies = await this.prisma.competencyProgress.findMany({
      where: { traineeProfileId: targetTraineeId },
      include: { procedure: true },
    });

    const totalRequired = competencies.reduce((acc, curr) => acc + curr.requiredCount, 0);
    const totalCompleted = competencies.reduce((acc, curr) => acc + curr.completedCount, 0);
    const overallPercentage = totalRequired > 0 ? Math.min(100, Math.round((totalCompleted / totalRequired) * 100)) : 0;

    return {
      overallPercentage,
      totalRequired,
      totalCompleted,
      data: competencies,
    };
  }

  // ─── 5. إحصائيات والتحليلات اللحظية للـ Logbook ──────────────────────────
  @Get('dashboard-stats')
  @RequireRoles('trainee', 'trainer', 'academic_supervisor', 'org_manager', 'platform_owner', 'hospital_administrator')
  @ApiOperation({ summary: 'إحصائيات Logbook اللحظية للدشبورد' })
  async getLogbookStats(@CurrentUser() user: IAuthenticatedUser) {
    let profile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });
    if (!profile && !user.roles.includes('platform_owner') && !user.roles.includes('org_manager') && !user.roles.includes('hospital_administrator')) {
    }

    const whereCondition = profile ? { traineeProfileId: profile.id } : { organizationId: user.organizationId };

    const totalCases = await this.prisma.clinicalCaseLog.count({
      where: whereCondition,
    });

    const approvedCases = await this.prisma.clinicalCaseLog.count({
      where: { ...whereCondition, status: { in: ['trainer_approved', 'completed'] } },
    });

    const pendingApproval = await this.prisma.clinicalCaseLog.count({
      where: { ...whereCondition, status: 'submitted' },
    });

    return {
      totalCases,
      approvedCases,
      pendingApproval,
      completionRate: totalCases > 0 ? Math.round((approvedCases / totalCases) * 100) : 0,
    };
  }

  private async transitionLog(id: string, user: IAuthenticatedUser, status: string, action: string) {
    const previous = await this.prisma.clinicalCaseLog.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!previous) return { success: false, message: 'السجل غير موجود' };
    const log = await this.prisma.clinicalCaseLog.update({ where: { id }, data: { status } });
    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.accountId,
        action,
        entityType: 'ClinicalCaseLog',
        entityId: id,
        oldValues: { status: previous.status },
        newValues: { status },
      },
    });
    return { success: true, data: log };
  }
}
