import { Body, Controller, Delete, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HospitalCapacityService } from './hospital-capacity.service';
import {
  UpdateDepartmentCapacityDto,
  UpdateHospitalTotalCapacityDto,
  UpsertCapacityAllocationDto,
} from './dto/capacity-allocation.dto';
import { CurrentUser, RequireRoles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { IAuthenticatedUser } from '../../common/interfaces';

const WRITE_ROLES = ['hospital_administrator', 'platform_owner'] as const;
const READ_ROLES = [
  'hospital_administrator',
  'cluster_administrator',
  'training_director',
  'platform_owner',
] as const;

@ApiTags('Hospital Capacity (سعة المستشفى التفصيلية)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class HospitalCapacityController {
  constructor(private hospitalCapacityService: HospitalCapacityService) {}

  @Get(':id/capacity')
  @RequireRoles(...READ_ROLES)
  @ApiOperation({ summary: 'تفصيل الطاقة الاستيعابية الكاملة للمستشفى (كلي + أقسام + تخصصات + مدربين + مشرفين)' })
  async getBreakdown(@Param('id') id: string) {
    return this.hospitalCapacityService.getBreakdown(id);
  }

  @Put(':id/capacity/hospital')
  @RequireRoles(...WRITE_ROLES)
  @ApiOperation({ summary: 'تحديث الطاقة الاستيعابية الكلية للمستشفى (المستشفى فقط، لا يعدّلها التجمع)' })
  async updateHospitalTotal(
    @Param('id') id: string,
    @Body() dto: UpdateHospitalTotalCapacityDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.hospitalCapacityService.updateHospitalTotalCapacity(id, dto, user);
  }

  @Put(':id/capacity/allocations')
  @RequireRoles(...WRITE_ROLES)
  @ApiOperation({ summary: 'إضافة/تحديث قاعدة طاقة دقيقة (تخصص / جنس / فترة تدريب / مشرف / مدرب)' })
  async upsertAllocation(
    @Param('id') id: string,
    @Body() dto: UpsertCapacityAllocationDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.hospitalCapacityService.upsertAllocation(id, dto, user);
  }

  @Delete(':id/capacity/allocations/:allocationId')
  @RequireRoles(...WRITE_ROLES)
  @ApiOperation({ summary: 'حذف قاعدة طاقة دقيقة' })
  async deleteAllocation(
    @Param('id') id: string,
    @Param('allocationId') allocationId: string,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.hospitalCapacityService.deleteAllocation(id, allocationId, user);
  }

  @Patch('departments/:departmentId/capacity')
  @RequireRoles(...WRITE_ROLES)
  @ApiOperation({ summary: 'تحديث سعة القسم والحدود العليا للمدربين/المشرفين/المتدربين النشطين' })
  async updateDepartmentCapacity(
    @Param('departmentId') departmentId: string,
    @Body() dto: UpdateDepartmentCapacityDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.hospitalCapacityService.updateDepartmentCapacity(departmentId, dto, user);
  }
}
