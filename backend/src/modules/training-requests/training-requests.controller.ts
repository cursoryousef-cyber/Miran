import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TrainingRequestsService } from './training-requests.service';
import { TrainingRequestTraineesService } from './training-request-trainees.service';
import { GraduationService } from './graduation.service';
import { RequestCompositionService } from './request-composition.service';
import {
  CreateTrainingRequestDto,
  PreviewTrainingRequestDto,
  UpdateTrainingRequestDto,
} from './dto/training-request.dto';
import {
  ChangeAssignmentDto,
  HospitalRejectDto,
  HospitalReturnDto,
  ImportTraineesDto,
  MergeTraineesDto,
  PutOnHoldDto,
  RejectTraineeDto,
  RequestDataCorrectionDto,
  RequestMissingDocsDto,
  ReturnTraineeDto,
  SplitTraineeDto,
  UpdateTraineeRowDto,
} from './dto/training-request-trainee.dto';
import { CurrentUser, OrgContext, RequireRoles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PLATFORM_SCOPED_ROLES } from '../../common/role-scope';

const CLUSTER_ROLES = ['cluster_administrator', 'training_director', 'platform_owner'] as const;
const UNIVERSITY_ROLES = ['university_administrator', 'academic_affairs', 'platform_owner'] as const;
const HOSPITAL_ROLES = ['hospital_administrator', 'department_head', 'training_supervisor', 'platform_owner'] as const;

@ApiTags('Training Requests (طلبات التدريب التشغيلية الواردة للتجمع)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('training-requests')
export class TrainingRequestsController {
  constructor(
    private trainingRequestsService: TrainingRequestsService,
    private traineesService: TrainingRequestTraineesService,
    private graduationService: GraduationService,
    private compositionService: RequestCompositionService,
  ) {}

  // ─── University request composition (Module 5) ──────────────────────────────
  // Declared before the parameterised routes so the literal segments are not
  // captured as a request id.

  @Get('plan-options')
  @RequireRoles(...UNIVERSITY_ROLES, ...CLUSTER_ROLES)
  @ApiOperation({
    summary: 'قوالب الخطط المتاحة لبرنامج تدريبي مع اقتراح الإصدار المعتمد',
  })
  async planOptions(@Query('programId') programId: string) {
    return this.compositionService.getPlanOptions(programId);
  }

  @Post('preview')
  @RequireRoles(...UNIVERSITY_ROLES, ...CLUSTER_ROLES)
  @ApiOperation({
    summary: 'التحقق من الطلب قبل الإرسال وعرض ملخصه (البرنامج، الإصدار، عدد الروتيشنات، الأسابيع)',
  })
  async preview(@Body() dto: PreviewTrainingRequestDto) {
    return this.compositionService.previewRequest(dto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة طلبات التدريب الواردة للتجمع الصحي أو الصادرة من الجامعة' })
  @ApiQuery({ name: 'orgId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser() currentUser: IAuthenticatedUser,
    @OrgContext() orgId: string,
    @Query('orgId') overrideOrgId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    // A platform-scoped role governs the whole federation, so its view is not
    // narrowed by whichever organisation happens to be in context.
    const isPlatform = (currentUser?.roles ?? []).some((r) => PLATFORM_SCOPED_ROLES.includes(r));
    const effectiveOrgId = overrideOrgId ?? (isPlatform ? undefined : orgId);
    return this.trainingRequestsService.findAll(effectiveOrgId, +page, +limit);
  }

  @Get('hospital-review')
  @RequireRoles(...HOSPITAL_ROLES, ...CLUSTER_ROLES)
  @ApiOperation({ summary: 'قائمة المتدربين الموزَّعين على المستشفى لمراجعتها' })
  async findForHospitalReview(@OrgContext() orgId: string) {
    return this.traineesService.findForHospitalReview(orgId);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'ملخص الطلب: البرنامج والإصدار وعدد الروتيشنات والأسابيع وعدد الطلاب' })
  async summary(@Param('id') id: string) {
    return this.compositionService.getRequestSummary(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل طلب تدريب محدد' })
  async findOne(@Param('id') id: string) {
    return this.trainingRequestsService.findOne(id);
  }

  @Post()
  @RequireRoles(...UNIVERSITY_ROLES, ...CLUSTER_ROLES)
  @ApiOperation({ summary: 'إنشاء طلب تدريب جديد من الجامعة الموفدة إلى التجمع الصحي' })
  async create(
    @Body() dto: CreateTrainingRequestDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.trainingRequestsService.create(dto, user);
  }

  @Patch(':id')
  @RequireRoles(...CLUSTER_ROLES, ...UNIVERSITY_ROLES)
  @ApiOperation({ summary: 'تحديث حالة طلب التدريب، الملاحظات، وتوزيع المقاعد على المستشفيات' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTrainingRequestDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.trainingRequestsService.update(id, dto, user);
  }

  @Post(':id/auto-allocate')
  @RequireRoles(...CLUSTER_ROLES)
  @ApiOperation({ summary: 'التوزيع الذكي الآلي على المستشفيات بناء على الطاقة الاستيعابية' })
  async autoAllocate(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    return this.trainingRequestsService.autoAllocate(id, user);
  }

  @Get(':id/validate-capacity')
  @ApiOperation({ summary: 'التحقق من صحة الطاقة الاستيعابية قبل اعتماد التوزيع' })
  async validateCapacity(@Param('id') id: string) {
    return this.trainingRequestsService.validateCapacity(id);
  }

  @Post(':id/approve')
  @RequireRoles(...CLUSTER_ROLES)
  @ApiOperation({ summary: 'الموافقة النهائية واعتماد توزيع طلب التدريب' })
  async approve(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    return this.trainingRequestsService.approve(id, user);
  }

  @Post(':id/reject')
  @RequireRoles(...CLUSTER_ROLES, ...HOSPITAL_ROLES, 'trainer', 'training_supervisor')
  @ApiOperation({ summary: 'رفض طلب التدريب — من التجمع (نهائي) أو من سلسلة القبول' })
  async reject(
    @Param('id') id: string,
    @Body() body: { reason?: string; notes?: string },
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    const isCluster = user.roles?.some((r) => (CLUSTER_ROLES as readonly string[]).includes(r));
    if (isCluster) {
      return this.trainingRequestsService.reject(id, body.reason, user);
    }
    return this.trainingRequestsService.advanceAcceptanceChain(id, 'reject', body.notes ?? body.reason, user);
  }

  @Post(':id/return-to-university')
  @RequireRoles(...CLUSTER_ROLES)
  @ApiOperation({ summary: 'إعادة طلب التدريب للجامعة للتعديل' })
  async returnToUniversity(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.trainingRequestsService.returnToUniversity(id, body.notes, user);
  }

  @Post(':id/clone')
  @RequireRoles(...CLUSTER_ROLES, ...UNIVERSITY_ROLES)
  @ApiOperation({ summary: 'استنساخ توزيع طلب التدريب' })
  async cloneRequest(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    return this.trainingRequestsService.cloneRequest(id, user);
  }

  @Post(':id/reset')
  @RequireRoles(...CLUSTER_ROLES)
  @ApiOperation({ summary: 'إعادة ضبط وتصفير التوزيعات' })
  async resetRequest(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    return this.trainingRequestsService.resetRequest(id, user);
  }

  @Post(':id/accept-hospital-director')
  @RequireRoles('hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'قبول مدير المستشفى وإحالة الطلب للمشرف التدريبي' })
  async acceptByHospitalDirector(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.trainingRequestsService.acceptByHospitalDirector(id, body.notes, user);
  }

  @Post(':id/accept-supervisor')
  @RequireRoles('training_supervisor', 'academic_supervisor', 'platform_owner')
  @ApiOperation({ summary: 'قبول المشرف التدريبي وإحالة الطلب للمدرب السريري' })
  async acceptBySupervisor(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.trainingRequestsService.acceptBySupervisor(id, body.notes, user);
  }

  @Post(':id/accept-trainer')
  @RequireRoles('trainer', 'platform_owner')
  @ApiOperation({ summary: 'قبول المدرب السريري وتفعيل مقعد التدريب' })
  async acceptByTrainer(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.trainingRequestsService.acceptByTrainer(id, body.notes, user);
  }

  @Post(':id/accept-intern')
  @RequireRoles('trainee', 'platform_owner')
  @ApiOperation({ summary: 'موافقة طبيب الامتياز وتفعيل الخطة التدريبية' })
  async acceptByIntern(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    return this.trainingRequestsService.acceptByIntern(id, user);
  }

  // ─── صفوف المتدربين داخل الدفعة (المراحل 1–3) ───────────────────────────

  @Get(':id/trainees')
  @ApiOperation({ summary: 'صفوف المتدربين داخل دفعة طلب التدريب' })
  async findTrainees(@Param('id') id: string) {
    return this.traineesService.findByRequest(id);
  }

  @Post(':id/trainees/import')
  @RequireRoles(...UNIVERSITY_ROLES, ...CLUSTER_ROLES)
  @ApiOperation({ summary: 'استيراد صفوف المتدربين من الإكسل كمسودة (لا تُنشأ حسابات)' })
  async importTrainees(
    @Param('id') id: string,
    @Body() dto: ImportTraineesDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.traineesService.importTrainees(id, dto.rows, user);
  }

  @Post(':id/trainees/submit')
  @RequireRoles(...UNIVERSITY_ROLES)
  @ApiOperation({ summary: 'إرسال الدفعة للتجمع الصحي وتشغيل محرك التحقق' })
  async submitBatch(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    return this.traineesService.submitBatch(id, user);
  }

  @Post(':id/trainees/validate')
  @RequireRoles(...CLUSTER_ROLES)
  @ApiOperation({ summary: 'إعادة تشغيل محرك التحقق على الدفعة' })
  async validateBatch(@Param('id') id: string) {
    return this.traineesService.runValidation(id);
  }

  @Get('trainees/returned')
  @RequireRoles(...UNIVERSITY_ROLES)
  @ApiOperation({ summary: 'الصفوف المُعادة للجامعة للتصحيح (لوحة تصحيحات الجامعة)' })
  async findReturned(@OrgContext() orgId: string) {
    return this.traineesService.findReturnedForUniversity(orgId);
  }

  @Patch('trainees/:rowId')
  @RequireRoles(...CLUSTER_ROLES)
  @ApiOperation({ summary: 'تعديل بيانات صف متدرب مع توثيق سجل الإصدارات' })
  async editTrainee(
    @Param('rowId') rowId: string,
    @Body() dto: UpdateTraineeRowDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.traineesService.editTrainee(rowId, dto, user);
  }

  @Post('trainees/:rowId/merge')
  @RequireRoles(...CLUSTER_ROLES)
  @ApiOperation({ summary: 'دمج صفوف مكررة في الصف الأساسي' })
  async mergeTrainees(
    @Param('rowId') rowId: string,
    @Body() dto: MergeTraineesDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.traineesService.mergeTrainees(rowId, dto, user);
  }

  @Post('trainees/:rowId/split')
  @RequireRoles(...CLUSTER_ROLES)
  @ApiOperation({ summary: 'تقسيم صف متدرب إلى عدة صفوف' })
  async splitTrainee(
    @Param('rowId') rowId: string,
    @Body() dto: SplitTraineeDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.traineesService.splitTrainee(rowId, dto, user);
  }

  @Post('trainees/:rowId/approve')
  @RequireRoles(...CLUSTER_ROLES)
  @ApiOperation({ summary: 'اعتماد المتدرب وترقيته إلى ملف تدريبي حقيقي' })
  async approveTrainee(@Param('rowId') rowId: string, @CurrentUser() user: IAuthenticatedUser) {
    return this.traineesService.approveTrainee(rowId, user);
  }

  @Post('trainees/:rowId/reject')
  @RequireRoles(...CLUSTER_ROLES)
  @ApiOperation({ summary: 'رفض المتدرب نهائياً' })
  async rejectTrainee(
    @Param('rowId') rowId: string,
    @Body() dto: RejectTraineeDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.traineesService.rejectTrainee(rowId, dto, user);
  }

  @Post('trainees/:rowId/return')
  @RequireRoles(...CLUSTER_ROLES)
  @ApiOperation({ summary: 'إعادة المتدرب للجامعة مع السبب والمستندات المطلوبة وآخر موعد' })
  async returnTrainee(
    @Param('rowId') rowId: string,
    @Body() dto: ReturnTraineeDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.traineesService.returnTraineeToUniversity(rowId, dto, user);
  }

  @Post('trainees/:rowId/resubmit')
  @RequireRoles(...UNIVERSITY_ROLES)
  @ApiOperation({ summary: 'إعادة إرسال المتدرب بعد التصحيح من الجامعة' })
  async resubmitTrainee(
    @Param('rowId') rowId: string,
    @Body() dto: UpdateTraineeRowDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.traineesService.resubmitTrainee(rowId, dto, user);
  }

  // ─── التوزيع اليدوي / إعادة التوزيع لصف فردي ─────────────────────────────

  @Patch('trainees/:rowId/allocation')
  @RequireRoles(...CLUSTER_ROLES)
  @ApiOperation({
    summary: 'تعيين أو إعادة تعيين متدرب يدوياً لمستشفى محدد عبر سلسلة التحقق الكاملة',
  })
  async allocateRow(
    @Param('rowId') rowId: string,
    @Body() body: { hospitalId?: string },
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.trainingRequestsService.allocateTraineeRow(rowId, body.hospitalId, user);
  }

  // ─── Phase 4: Stage 6 — Hospital Review Actions ───────────────────────────

  @Post('trainees/:rowId/hospital-review/start')
  @RequireRoles(...HOSPITAL_ROLES)
  @ApiOperation({ summary: 'بدء مراجعة المستشفى للمتدرب (allocated → hospital_review)' })
  async startHospitalReview(@Param('rowId') rowId: string, @CurrentUser() user: IAuthenticatedUser) {
    return this.traineesService.startHospitalReview(rowId, user);
  }

  @Post('trainees/:rowId/hospital-review/reject')
  @RequireRoles(...HOSPITAL_ROLES)
  @ApiOperation({ summary: 'رفض المتدرب نهائياً من قِبَل المستشفى' })
  async hospitalRejectIntern(
    @Param('rowId') rowId: string,
    @Body() dto: HospitalRejectDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.traineesService.hospitalRejectIntern(rowId, dto, user);
  }

  @Post('trainees/:rowId/hospital-review/return-to-cluster')
  @RequireRoles(...HOSPITAL_ROLES)
  @ApiOperation({ summary: 'إعادة المتدرب للتجمع لإعادة التوزيع' })
  async hospitalReturnToCluster(
    @Param('rowId') rowId: string,
    @Body() dto: HospitalReturnDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.traineesService.hospitalReturnToCluster(rowId, dto, user);
  }

  @Post('trainees/:rowId/hospital-review/request-documents')
  @RequireRoles(...HOSPITAL_ROLES)
  @ApiOperation({ summary: 'طلب مستندات ناقصة من الجامعة للمتدرب' })
  async requestMissingDocuments(
    @Param('rowId') rowId: string,
    @Body() dto: RequestMissingDocsDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.traineesService.requestMissingDocuments(rowId, dto, user);
  }

  @Post('trainees/:rowId/hospital-review/request-correction')
  @RequireRoles(...HOSPITAL_ROLES)
  @ApiOperation({ summary: 'طلب تصحيح بيانات المتدرب من الجامعة' })
  async requestDataCorrection(
    @Param('rowId') rowId: string,
    @Body() dto: RequestDataCorrectionDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.traineesService.requestDataCorrection(rowId, dto, user);
  }

  @Patch('trainees/:rowId/hospital-review/assignment')
  @RequireRoles(...HOSPITAL_ROLES, ...CLUSTER_ROLES)
  @ApiOperation({ summary: 'تعديل القسم / المدرب / المشرف / التواريخ مع التحقق من الطاقة' })
  async changeAssignment(
    @Param('rowId') rowId: string,
    @Body() dto: ChangeAssignmentDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.traineesService.changeAssignment(rowId, dto, user);
  }

  @Post('trainees/:rowId/hospital-review/hold')
  @RequireRoles(...HOSPITAL_ROLES)
  @ApiOperation({ summary: 'إيقاف مراجعة المتدرب مؤقتاً (allocated/hospital_review → on_hold)' })
  async putOnHold(
    @Param('rowId') rowId: string,
    @Body() dto: PutOnHoldDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.traineesService.putOnHold(rowId, dto, user);
  }

  @Post('trainees/:rowId/hospital-review/resume')
  @RequireRoles(...HOSPITAL_ROLES)
  @ApiOperation({ summary: 'استئناف مراجعة المتدرب من الإيقاف المؤقت (on_hold → hospital_review)' })
  async resumeFromHold(@Param('rowId') rowId: string, @CurrentUser() user: IAuthenticatedUser) {
    return this.traineesService.resumeFromHold(rowId, user);
  }

  // ─── Phase 5: Multi-level acceptance chain (TrainingRequest level) ────────
  @Post(':id/accept')
  @RequireRoles(...HOSPITAL_ROLES, 'trainer', 'training_supervisor')
  @ApiOperation({ summary: 'الموافقة على الطلب — تقدم سلسلة القبول للخطوة التالية' })
  async acceptRequest(
    @Param('id') id: string,
    @Body('notes') notes?: string,
    @CurrentUser() user?: IAuthenticatedUser,
  ) {
    return this.trainingRequestsService.advanceAcceptanceChain(id, 'approve', notes, user);
  }

  @Post(':id/return-to-cluster')
  @RequireRoles(...HOSPITAL_ROLES, 'trainer', 'training_supervisor')
  @ApiOperation({ summary: 'إعادة الطلب للتجمع الصحي من مرحلة القبول الحالية' })
  async returnToCluster(
    @Param('id') id: string,
    @Body('notes') notes?: string,
    @CurrentUser() user?: IAuthenticatedUser,
  ) {
    return this.trainingRequestsService.advanceAcceptanceChain(id, 'return_to_cluster', notes, user);
  }

  // ─── Phase 8: Graduation ─────────────────────────────────────────────────
  @Get('trainees/:profileId/graduation/eligibility')
  @ApiOperation({ summary: 'التحقق من استيفاء متطلبات التخرج' })
  async checkGraduationEligibility(@Param('profileId') profileId: string) {
    return this.graduationService.checkEligibility(profileId);
  }

  @Post('trainees/:profileId/graduation/approve')
  @RequireRoles('trainer', 'training_supervisor', ...HOSPITAL_ROLES, 'university_administrator')
  @ApiOperation({ summary: 'تقديم موافقة الجهة على تخرج المتدرب' })
  async submitGraduationApproval(
    @Param('profileId') profileId: string,
    @CurrentUser() user: IAuthenticatedUser,
    @Body('notes') notes?: string,
  ) {
    return this.graduationService.submitApproval(profileId, user, notes);
  }
}
