import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, RequireRoles } from '../../common/decorators';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainerReassignmentService } from './trainer-reassignment.service';
import { TrainerLeaveService } from './trainer-leave.service';
import { TrainerQualificationService } from './trainer-qualification.service';

@ApiTags('Trainers (المدربون)')
@Controller('trainers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TrainersController {
  constructor(
    private prisma: PrismaService,
    private reassignmentService: TrainerReassignmentService,
    private leaveService: TrainerLeaveService,
    private qualificationService: TrainerQualificationService,
  ) {}

  // ─── Program Qualification ──────────────────────────────────────────────────
  // Registered before the parameterised trainer routes below so that the literal
  // segments are not swallowed by ':id'.

  @Get('qualified')
  @RequireRoles(
    'training_supervisor', 'hospital_administrator', 'cluster_administrator',
    'training_director', 'platform_owner',
  )
  @ApiOperation({ summary: 'المدربون المؤهلون لبرنامج تدريبي في الجهة' })
  async listQualifiedTrainers(
    @Query('programId') programId: string,
    @CurrentUser() user: IAuthenticatedUser,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.qualificationService.listQualifiedTrainers(
      organizationId || user.organizationId,
      programId,
    );
  }

  @Get(':id/qualifications')
  @RequireRoles(
    'training_supervisor', 'hospital_administrator', 'cluster_administrator',
    'training_director', 'trainer', 'platform_owner',
  )
  @ApiOperation({ summary: 'برامج المدرب المؤهل لها مع السعة والإشغال' })
  async listQualifications(@Param('id') trainerProfileId: string) {
    return this.qualificationService.listForTrainer(trainerProfileId);
  }

  @Post(':id/qualifications')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'تأهيل مدرب لبرنامج تدريبي' })
  async addQualification(
    @Param('id') trainerProfileId: string,
    @Body() dto: { programId: string; maxTrainees?: number },
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.qualificationService.addQualification(trainerProfileId, dto, user);
  }

  @Patch('qualifications/:qualificationId')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'تعديل سعة أو حالة تأهيل المدرب' })
  async updateQualification(
    @Param('qualificationId') qualificationId: string,
    @Body() dto: { maxTrainees?: number; isActive?: boolean },
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.qualificationService.updateQualification(qualificationId, dto, user);
  }

  @Delete('qualifications/:qualificationId')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'حذف تأهيل مدرب لبرنامج' })
  async removeQualification(
    @Param('qualificationId') qualificationId: string,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.qualificationService.removeQualification(qualificationId, user);
  }

  // ─── Profile Endpoints ──────────────────────────────────────────────────────

  @Get('me')
  async getMyProfile(@CurrentUser() user: IAuthenticatedUser) {
    const profile = await this.prisma.trainerProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
      include: { person: true, organization: true, department: true },
    });
    if (!profile) return { message: 'لا يوجد ملف مدرب لهذا الحساب' };
    return profile;
  }

  @Get()
  async findAll(@CurrentUser() user: IAuthenticatedUser) {
    const trainers = await this.prisma.trainerProfile.findMany({
      where: { organizationId: user.organizationId },
      include: {
        person: true,
        department: true,
        _count: { select: { rotations: { where: { status: 'active' } } } },
      },
    });
    return { data: trainers };
  }

  // ─── Reassignment Endpoints ─────────────────────────────────────────────────

  @Post('reassign')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'إعادة إسناد متدرب واحد إلى مدرب آخر' })
  async reassignSingle(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: {
      traineeProfileId: string;
      rotationId: string;
      newTrainerId: string;
      reason: string;
      notes?: string;
      trainerLeaveId?: string;
    },
  ) {
    return this.reassignmentService.reassignSingle(dto, user.accountId, user.organizationId);
  }

  @Post('reassign-bulk')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'إعادة إسناد عدة متدربين إلى مدرب آخر' })
  async reassignBulk(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: {
      traineeProfileIds: string[];
      newTrainerId: string;
      reason: string;
      notes?: string;
      trainerLeaveId?: string;
    },
  ) {
    return this.reassignmentService.reassignMultiple(dto, user.accountId, user.organizationId);
  }

  @Post('reassign-trainer')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'نقل جميع متدربي مدرب إلى مدرب آخر' })
  async reassignEntireTrainer(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: {
      fromTrainerId: string;
      toTrainerId: string;
      reason: string;
      notes?: string;
      trainerLeaveId?: string;
    },
  ) {
    return this.reassignmentService.reassignEntireTrainer(dto, user.accountId, user.organizationId);
  }

  @Post('reassign-department')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'نقل جميع متدربي قسم إلى مدرب آخر' })
  async reassignEntireDepartment(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: {
      departmentId: string;
      fromTrainerId?: string;
      toTrainerId: string;
      reason: string;
      notes?: string;
    },
  ) {
    return this.reassignmentService.reassignEntireDepartment(dto, user.accountId, user.organizationId);
  }

  @Get(':id/suggest-replacements')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'اقتراح مدربين بدلاء مؤهلين (مرتبين حسب السعة المتاحة)' })
  async suggestReplacements(@Param('id') id: string) {
    return this.reassignmentService.suggestReplacements(id);
  }

  @Get('reassignment-history')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'cluster_administrator', 'platform_owner')
  @ApiOperation({ summary: 'سجل عمليات إعادة الإسناد (audit trail)' })
  async getReassignmentHistory(
    @CurrentUser() user: IAuthenticatedUser,
    @Query('trainerProfileId') trainerProfileId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reassignmentService.getReassignmentHistory({
      organizationId: user.organizationId,
      trainerProfileId,
      departmentId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  // ─── Leave Endpoints ────────────────────────────────────────────────────────

  @Post('leaves')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'trainer', 'platform_owner')
  @ApiOperation({ summary: 'تسجيل إجازة مدرب جديدة' })
  async createLeave(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: {
      trainerProfileId: string;
      leaveType: string;
      startDate: string;
      endDate: string;
      reason?: string;
      replacementTrainerId?: string;
    },
  ) {
    return this.leaveService.createLeave(dto, user.accountId, user.organizationId);
  }

  @Get('leaves')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'trainer', 'platform_owner')
  @ApiOperation({ summary: 'قائمة إجازات المدربين في المستشفى' })
  async getLeaves(
    @CurrentUser() user: IAuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.leaveService.getLeaves(user.organizationId, status);
  }

  @Get('leaves/upcoming')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'الإجازات القادمة خلال 30 يوماً' })
  async getUpcomingLeaves(
    @CurrentUser() user: IAuthenticatedUser,
    @Query('days') days?: string,
  ) {
    return this.leaveService.getUpcomingLeaves(user.organizationId, days ? parseInt(days) : 30);
  }

  @Patch('leaves/:id/approve')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'الموافقة على إجازة مدرب' })
  async approveLeave(
    @Param('id') id: string,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.leaveService.approveLeave(id, user.accountId, user.organizationId);
  }

  @Patch('leaves/:id/cancel')
  @RequireRoles('training_supervisor', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'إلغاء إجازة مدرب' })
  async cancelLeave(
    @Param('id') id: string,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.leaveService.cancelLeave(id, user.accountId);
  }
}
