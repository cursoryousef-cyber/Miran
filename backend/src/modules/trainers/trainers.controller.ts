import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import {
  CAPABILITIES,
  CapabilityGuard,
  RequireCapability,
  ScopeGuard,
} from '../../common/authz';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainerReassignmentService } from './trainer-reassignment.service';
import { TrainerLeaveService } from './trainer-leave.service';
import { TrainerQualificationService } from './trainer-qualification.service';

@ApiTags('Trainers (المدربون)')
@Controller('trainers')
// Trainer management is hospital training operations. `hospital_administrator`
// held every route here — including the reassignment routes, which move trainees
// between trainers and departments — so the hospital director could run training
// through this controller even after being removed from the others.
@UseGuards(JwtAuthGuard, CapabilityGuard, ScopeGuard)
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

  @Get('workspace-cards')
  @RequireCapability(
    CAPABILITIES.TRAINER_MANAGE,
    CAPABILITIES.TRAINEE_VIEW_HOSPITAL,
    CAPABILITIES.TRAINEE_VIEW_DEPARTMENT,
  )
  @ApiOperation({
    summary:
      'بطاقات المدربين لمساحة عمل المستشفى — التأهيل والسعة والإشغال والإجازة',
  })
  async workspaceCards(
    @CurrentUser() user: IAuthenticatedUser,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.qualificationService.listWorkspaceCards(
      organizationId || user.organizationId,
    );
  }

  @Get('qualified')
  @RequireCapability(
    CAPABILITIES.TRAINER_MANAGE,
    CAPABILITIES.TRAINEE_VIEW_HOSPITAL,
    CAPABILITIES.TRAINEE_VIEW_DEPARTMENT,
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
  @RequireCapability(
    CAPABILITIES.TRAINER_MANAGE,
    CAPABILITIES.TRAINEE_VIEW_HOSPITAL,
    CAPABILITIES.TRAINEE_VIEW_DEPARTMENT,
  )
  @ApiOperation({ summary: 'برامج المدرب المؤهل لها مع السعة والإشغال' })
  async listQualifications(@Param('id') trainerProfileId: string) {
    return this.qualificationService.listForTrainer(trainerProfileId);
  }

  @Post(':id/qualifications')
  @RequireCapability(CAPABILITIES.TRAINER_MANAGE)
  @ApiOperation({ summary: 'تأهيل مدرب لبرنامج تدريبي' })
  async addQualification(
    @Param('id') trainerProfileId: string,
    @Body() dto: { programId: string; maxTrainees?: number },
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.qualificationService.addQualification(
      trainerProfileId,
      dto,
      user,
    );
  }

  @Patch('qualifications/:qualificationId')
  @RequireCapability(CAPABILITIES.TRAINER_MANAGE)
  @ApiOperation({ summary: 'تعديل سعة أو حالة تأهيل المدرب' })
  async updateQualification(
    @Param('qualificationId') qualificationId: string,
    @Body() dto: { maxTrainees?: number; isActive?: boolean },
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.qualificationService.updateQualification(
      qualificationId,
      dto,
      user,
    );
  }

  @Delete('qualifications/:qualificationId')
  @RequireCapability(CAPABILITIES.TRAINER_MANAGE)
  @ApiOperation({ summary: 'حذف تأهيل مدرب لبرنامج' })
  async removeQualification(
    @Param('qualificationId') qualificationId: string,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.qualificationService.removeQualification(qualificationId, user);
  }

  // ─── Profile Endpoints ──────────────────────────────────────────────────────

  /** Own profile — scoped by the caller's own account, so it needs no capability. */
  @Get('me')
  async getMyProfile(@CurrentUser() user: IAuthenticatedUser) {
    const profile = await this.prisma.trainerProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
      include: { person: true, organization: true, department: true },
    });
    if (!profile) return { message: 'لا يوجد ملف مدرب لهذا الحساب' };
    return profile;
  }

  /**
   * The trainer roster is a training resource, not a staff directory: it is who
   * supervises trainees and how loaded they are. `org_member.view` is deliberately
   * NOT accepted here — the hospital director holds it, and accepting it would let
   * them back into training data through a read. General staff listings live at
   * /org-members.
   */
  @Get()
  @RequireCapability(
    CAPABILITIES.TRAINER_MANAGE,
    CAPABILITIES.TRAINEE_VIEW_HOSPITAL,
    CAPABILITIES.TRAINEE_VIEW_DEPARTMENT,
  )
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
  @RequireCapability(CAPABILITIES.ALLOCATION_HOSPITAL_REASSIGN)
  @ApiOperation({ summary: 'إعادة إسناد متدرب واحد إلى مدرب آخر' })
  async reassignSingle(
    @CurrentUser() user: IAuthenticatedUser,
    @Body()
    dto: {
      traineeProfileId: string;
      rotationId: string;
      newTrainerId: string;
      reason: string;
      notes?: string;
      trainerLeaveId?: string;
    },
  ) {
    return this.reassignmentService.reassignSingle(
      dto,
      user.accountId,
      user.organizationId,
    );
  }

  @Post('reassign-bulk')
  @RequireCapability(CAPABILITIES.ALLOCATION_HOSPITAL_REASSIGN)
  @ApiOperation({ summary: 'إعادة إسناد عدة متدربين إلى مدرب آخر' })
  async reassignBulk(
    @CurrentUser() user: IAuthenticatedUser,
    @Body()
    dto: {
      traineeProfileIds: string[];
      newTrainerId: string;
      reason: string;
      notes?: string;
      trainerLeaveId?: string;
    },
  ) {
    return this.reassignmentService.reassignMultiple(
      dto,
      user.accountId,
      user.organizationId,
    );
  }

  @Post('reassign-trainer')
  @RequireCapability(CAPABILITIES.ALLOCATION_HOSPITAL_REASSIGN)
  @ApiOperation({ summary: 'نقل جميع متدربي مدرب إلى مدرب آخر' })
  async reassignEntireTrainer(
    @CurrentUser() user: IAuthenticatedUser,
    @Body()
    dto: {
      fromTrainerId: string;
      toTrainerId: string;
      reason: string;
      notes?: string;
      trainerLeaveId?: string;
    },
  ) {
    return this.reassignmentService.reassignEntireTrainer(
      dto,
      user.accountId,
      user.organizationId,
    );
  }

  @Post('reassign-department')
  @RequireCapability(CAPABILITIES.ALLOCATION_HOSPITAL_REASSIGN)
  @ApiOperation({ summary: 'نقل جميع متدربي قسم إلى مدرب آخر' })
  async reassignEntireDepartment(
    @CurrentUser() user: IAuthenticatedUser,
    @Body()
    dto: {
      departmentId: string;
      fromTrainerId?: string;
      toTrainerId: string;
      reason: string;
      notes?: string;
    },
  ) {
    return this.reassignmentService.reassignEntireDepartment(
      dto,
      user.accountId,
      user.organizationId,
    );
  }

  @Get(':id/suggest-replacements')
  @RequireCapability(
    CAPABILITIES.TRAINER_MANAGE,
    CAPABILITIES.TRAINEE_VIEW_HOSPITAL,
    CAPABILITIES.TRAINEE_VIEW_DEPARTMENT,
  )
  @ApiOperation({
    summary: 'اقتراح مدربين بدلاء مؤهلين (مرتبين حسب السعة المتاحة)',
  })
  async suggestReplacements(@Param('id') id: string) {
    return this.reassignmentService.suggestReplacements(id);
  }

  @Get('reassignment-history')
  @RequireCapability(
    CAPABILITIES.ALLOCATION_HOSPITAL_REASSIGN,
    CAPABILITIES.TIMELINE_VIEW,
  )
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
  @RequireCapability(
    CAPABILITIES.TRAINER_MANAGE,
    CAPABILITIES.TRAINEE_VIEW_ASSIGNED,
  )
  @ApiOperation({ summary: 'تسجيل إجازة مدرب جديدة' })
  async createLeave(
    @CurrentUser() user: IAuthenticatedUser,
    @Body()
    dto: {
      trainerProfileId: string;
      leaveType: string;
      startDate: string;
      endDate: string;
      reason?: string;
      replacementTrainerId?: string;
    },
  ) {
    return this.leaveService.createLeave(
      dto,
      user.accountId,
      user.organizationId,
    );
  }

  @Get('leaves')
  @RequireCapability(
    CAPABILITIES.TRAINER_MANAGE,
    CAPABILITIES.TRAINEE_VIEW_ASSIGNED,
  )
  @ApiOperation({ summary: 'قائمة إجازات المدربين في المستشفى' })
  async getLeaves(
    @CurrentUser() user: IAuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.leaveService.getLeaves(user.organizationId, status);
  }

  @Get('leaves/upcoming')
  @RequireCapability(
    CAPABILITIES.TRAINER_MANAGE,
    CAPABILITIES.TRAINEE_VIEW_HOSPITAL,
    CAPABILITIES.TRAINEE_VIEW_ASSIGNED,
  )
  @ApiOperation({ summary: 'الإجازات القادمة خلال 30 يوماً' })
  async getUpcomingLeaves(
    @CurrentUser() user: IAuthenticatedUser,
    @Query('days') days?: string,
  ) {
    return this.leaveService.getUpcomingLeaves(
      user.organizationId,
      days ? parseInt(days) : 30,
    );
  }

  @Patch('leaves/:id/approve')
  @RequireCapability(CAPABILITIES.TRAINER_MANAGE)
  @ApiOperation({ summary: 'الموافقة على إجازة مدرب' })
  async approveLeave(
    @Param('id') id: string,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.leaveService.approveLeave(
      id,
      user.accountId,
      user.organizationId,
    );
  }

  @Patch('leaves/:id/cancel')
  @RequireCapability(CAPABILITIES.TRAINER_MANAGE)
  @ApiOperation({ summary: 'إلغاء إجازة مدرب' })
  async cancelLeave(
    @Param('id') id: string,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.leaveService.cancelLeave(id, user.accountId);
  }
}
