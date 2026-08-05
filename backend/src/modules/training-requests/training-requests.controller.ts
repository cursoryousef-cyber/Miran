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
import { CurrentUser, OrgContext } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { IAuthenticatedUser } from '../../common/interfaces';

@ApiTags('Training Requests (طلبات التدريب التشغيلية الواردة للتجمع)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({ summary: 'إنشاء طلب تدريب جديد من الجامعة الموفدة إلى التجمع الصحي' })
  async create(
    @Body() dto: CreateTrainingRequestDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.trainingRequestsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث حالة طلب التدريب، الملاحظات، وتوزيع المقاعد على المستشفيات' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTrainingRequestDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.trainingRequestsService.update(id, dto, user);
  }
}
