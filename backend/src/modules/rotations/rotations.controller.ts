import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, RequireRoles } from '../../common/decorators';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CAPABILITIES, CapabilityGuard, RequireCapability,
} from '../../common/authz';

@ApiTags('Rotations & Departments (الروتيشنات والأقسام السريرية)')
@Controller('rotations')
@UseGuards(JwtAuthGuard, RolesGuard, CapabilityGuard)
@ApiBearerAuth('JWT-auth')
export class RotationsController {
  constructor(private prisma: PrismaService) {}

  @Get('my')
  async getMyRotations(@CurrentUser() user: IAuthenticatedUser) {
    const traineeProfile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });
    if (!traineeProfile) return { data: [] };
    const rotations = await this.prisma.rotation.findMany({
      where: { traineeProfileId: traineeProfile.id },
      include: { department: true, trainerProfile: { include: { person: true } } },
      orderBy: { startDate: 'asc' },
    });
    return { data: rotations };
  }

  @Get()
  @RequireCapability(
    CAPABILITIES.TRAINEE_VIEW_SCOPE,
    CAPABILITIES.TRAINEE_VIEW_HOSPITAL,
    CAPABILITIES.TRAINEE_VIEW_DEPARTMENT,
    CAPABILITIES.TRAINEE_VIEW_ASSIGNED,
  )
  async findAll(@CurrentUser() user: IAuthenticatedUser) {
    const rotations = await this.prisma.rotation.findMany({
      where: { organizationId: user.organizationId },
      include: {
        department: true,
        traineeProfile: { include: { person: true } },
        trainerProfile: { include: { person: true } },
      },
      orderBy: { startDate: 'asc' },
    });
    return { data: rotations };
  }

  @Post()
  @RequireRoles('org_manager', 'hospital_administrator', 'training_supervisor', 'platform_owner')
  @ApiOperation({ summary: 'إنشاء روتيشن جديد وتعيين المتدرب والمدرب والقسم' })
  async createRotation(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: {
      traineeProfileId: string;
      departmentId: string;
      trainerProfileId: string;
      startDate: string;
      endDate: string;
      status?: string;
    },
  ) {
    const rotation = await this.prisma.rotation.create({
      data: {
        organizationId: user.organizationId,
        traineeProfileId: dto.traineeProfileId,
        departmentId: dto.departmentId,
        trainerProfileId: dto.trainerProfileId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: dto.status || 'active',
      },
      include: {
        department: true,
        traineeProfile: { include: { person: true } },
        trainerProfile: { include: { person: true } },
      },
    });
    return { success: true, data: rotation };
  }

  @Patch(':id')
  @RequireRoles('org_manager', 'hospital_administrator', 'training_supervisor', 'platform_owner')
  @ApiOperation({ summary: 'تعديل بيانات روتيشن (القسم / المدرب / التواريخ / الحالة)' })
  async updateRotation(
    @Param('id') id: string,
    @Body() dto: {
      departmentId?: string;
      trainerProfileId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    },
  ) {
    const rotation = await this.prisma.rotation.update({
      where: { id },
      data: {
        departmentId: dto.departmentId,
        trainerProfileId: dto.trainerProfileId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status,
      },
      include: {
        department: true,
        traineeProfile: { include: { person: true } },
        trainerProfile: { include: { person: true } },
      },
    });
    return { success: true, data: rotation };
  }

  @Delete(':id')
  @RequireRoles('org_manager', 'hospital_administrator', 'training_supervisor', 'platform_owner')
  @ApiOperation({ summary: 'حذف روتيشن' })
  async deleteRotation(@Param('id') id: string) {
    await this.prisma.rotation.delete({ where: { id } });
    return { success: true, message: 'تم حذف الروتيشن' };
  }

  // ─── Departments Endpoints ───────────────────────────────────────────────
  @Get('departments')
  @RequireCapability(
    CAPABILITIES.DEPARTMENT_MANAGE,
    CAPABILITIES.CAPACITY_VIEW,
    CAPABILITIES.TRAINEE_VIEW_HOSPITAL,
  )
  @ApiOperation({ summary: 'قائمة الأقسام السريرية وطاقتها الاستيعابية' })
  async getDepartments(@CurrentUser() user: IAuthenticatedUser) {
    const departments = await this.prisma.department.findMany({
      where: { organizationId: user.organizationId },
      include: {
        _count: { select: { rotations: true, trainerProfiles: true } },
      },
      orderBy: { nameAr: 'asc' },
    });
    return { data: departments };
  }

  @Post('departments')
  @RequireRoles('org_manager', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'إنشاء قسم سريري جديد' })
  async createDepartment(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: { nameAr: string; nameEn?: string; code?: string; capacity?: number },
  ) {
    const dept = await this.prisma.department.create({
      data: {
        organizationId: user.organizationId,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        code: dto.code || dto.nameAr.toUpperCase().slice(0, 10),
        capacity: dto.capacity || 20,
      },
    });
    return { success: true, data: dept };
  }

  @Patch('departments/:id')
  @RequireRoles('org_manager', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'تحديث بيانات القسم والطاقة الاستيعابية' })
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: { nameAr?: string; nameEn?: string; capacity?: number; isActive?: boolean },
  ) {
    const dept = await this.prisma.department.update({
      where: { id },
      data: dto,
    });
    return { success: true, data: dept };
  }

  @Delete('departments/:id')
  @RequireRoles('org_manager', 'hospital_administrator', 'platform_owner')
  @ApiOperation({ summary: 'حذف قسم سريري' })
  async deleteDepartment(@Param('id') id: string) {
    await this.prisma.department.delete({ where: { id } });
    return { success: true, message: 'تم حذف القسم' };
  }
}
