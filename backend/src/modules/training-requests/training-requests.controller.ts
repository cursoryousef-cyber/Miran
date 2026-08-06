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
import { CreateTrainingRequestDto, UpdateTrainingRequestDto } from './dto/training-request.dto';
import { CurrentUser, OrgContext, RequireRoles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { IAuthenticatedUser } from '../../common/interfaces';

const CLUSTER_ROLES = ['cluster_administrator', 'training_director', 'platform_owner'] as const;
const UNIVERSITY_ROLES = ['university_administrator', 'academic_affairs', 'platform_owner'] as const;

@ApiTags('Training Requests (طلبات التدريب التشغيلية الواردة للتجمع)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('training-requests')
export class TrainingRequestsController {
  constructor(private trainingRequestsService: TrainingRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة طلبات التدريب الواردة للتجمع الصحي أو الصادرة من الجامعة' })
  @ApiQuery({ name: 'orgId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @OrgContext() orgId: string,
    @Query('orgId') overrideOrgId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.trainingRequestsService.findAll(overrideOrgId || orgId, +page, +limit);
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
  @RequireRoles(...CLUSTER_ROLES)
  @ApiOperation({ summary: 'رفض طلب التدريب' })
  async reject(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.trainingRequestsService.reject(id, body.reason, user);
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
}
