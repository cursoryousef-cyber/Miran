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
import { AcademicIntakesService } from './academic-intakes.service';
import { CreateAcademicIntakeDto, UpdateAcademicIntakeDto, AssignTraineesToIntakeDto } from './dto/academic-intake.dto';
import { CurrentUser, OrgContext, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { IAuthenticatedUser } from '../../common/interfaces';

@ApiTags('Academic Intakes (إدارة الدفعات الأكاديمية والطلاب)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('academic-intakes')
export class AcademicIntakesController {
  constructor(private intakesService: AcademicIntakesService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة الدفعات الأكاديمية (مثل: دفعة امتياز 2027)' })
  @ApiQuery({ name: 'academicYear', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @RequirePermissions('view_trainees')
  async findAll(
    @OrgContext() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.intakesService.findAll(orgId, +page, +limit, academicYear);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل دفعة أكاديمية مع قائمة المتدربين المسجلين بها' })
  @RequirePermissions('view_trainees')
  async findOne(@Param('id') id: string) {
    return this.intakesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'إنشاء دفعة أكاديمية جديدة' })
  @RequirePermissions('manage_trainees')
  async create(
    @Body() dto: CreateAcademicIntakeDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.intakesService.create(dto, user);
  }

  @Post(':id/assign-trainees')
  @ApiOperation({ summary: 'توزيع قائمة من المتدربين على هذه الدفعة الأكاديمية' })
  @RequirePermissions('manage_trainees')
  async assignTrainees(
    @Param('id') id: string,
    @Body() dto: AssignTraineesToIntakeDto,
  ) {
    return this.intakesService.assignTrainees(id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث بيانات دفعة أكاديمية' })
  @RequirePermissions('manage_trainees')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAcademicIntakeDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.intakesService.update(id, dto, user);
  }
}
