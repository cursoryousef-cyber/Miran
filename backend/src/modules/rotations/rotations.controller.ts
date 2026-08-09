import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CAPABILITIES, CapabilityGuard, RequireCapability, ScopeGuard, ScopedResource,
} from '../../common/authz';

@ApiTags('Rotations & Departments (الروتيشنات والأقسام السريرية)')
@Controller('rotations')
@UseGuards(JwtAuthGuard, RolesGuard, CapabilityGuard, ScopeGuard)
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
    if (user.roles.includes('hospital_administrator')) {
      throw new ForbiddenException('مدير المستشفى لا يملك صلاحية على الروتيشنات التدريبية');
    }

    if (user.roles.includes('trainee')) {
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

    if (user.roles.includes('trainer')) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { person: { userAccounts: { some: { id: user.accountId } } } },
      });
      if (!trainer) return { data: [] };
      const rotations = await this.prisma.rotation.findMany({
        where: { trainerProfileId: trainer.id, status: 'active' },
        include: {
          department: true,
          traineeProfile: { include: { person: true } },
          trainerProfile: { include: { person: true } },
        },
        orderBy: { startDate: 'asc' },
      });
      return { data: rotations };
    }

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

  // Rotation writes are hospital *training* management, so they are gated on the
  // capability that means exactly that, not on a role list. The previous list
  // admitted `hospital_administrator` — the role that holds no training
  // capability at all by construction — while excluding
  // `hospital_training_admin`, the role that owns hospital training. See
  // capabilities.ts for the two role definitions this contradicted.
  @Post()
  @RequireCapability(
    CAPABILITIES.ALLOCATION_HOSPITAL_ASSIGN,
    CAPABILITIES.ALLOCATION_HOSPITAL_REASSIGN,
  )
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
  @RequireCapability(
    CAPABILITIES.ALLOCATION_HOSPITAL_ASSIGN,
    CAPABILITIES.ALLOCATION_HOSPITAL_REASSIGN,
  )
  @ScopedResource('rotation', 'id')
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
  @RequireCapability(
    CAPABILITIES.ALLOCATION_HOSPITAL_ASSIGN,
    CAPABILITIES.ALLOCATION_HOSPITAL_REASSIGN,
  )
  @ScopedResource('rotation', 'id')
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
  @RequireCapability(CAPABILITIES.DEPARTMENT_MANAGE, CAPABILITIES.CAPACITY_MANAGE)
  @ApiOperation({ summary: 'إنشاء قسم سريري جديد' })
  async createDepartment(
    @CurrentUser() user: IAuthenticatedUser,
    @Body()
    dto: {
      nameAr: string;
      nameEn?: string;
      code?: string;
      capacity?: number;
      startDate?: string;
      endDate?: string;
      trainingPeriod?: string;
    },
  ) {
    if (!dto.nameAr || !dto.nameAr.trim()) {
      throw new BadRequestException('اسم القسم مطلوب');
    }
    if (dto.capacity !== undefined && dto.capacity < 1) {
      throw new BadRequestException('عدد المقاعد يجب أن يكون 1 على الأقل');
    }
    if (dto.startDate && dto.endDate && dto.startDate > dto.endDate) {
      throw new BadRequestException('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية');
    }

    const settings: Record<string, any> = {};
    if (dto.startDate) settings.startDate = dto.startDate;
    if (dto.endDate) settings.endDate = dto.endDate;
    if (dto.trainingPeriod) settings.trainingPeriod = dto.trainingPeriod;

    const dept = await this.prisma.department.create({
      data: {
        organizationId: user.organizationId,
        nameAr: dto.nameAr.trim(),
        nameEn: dto.nameEn,
        code: dto.code || dto.nameAr.trim().toUpperCase().slice(0, 10),
        capacity: dto.capacity ?? 10,
        settings,
      },
    });
    return { success: true, data: dept };
  }

  @Patch('departments/:id')
  @RequireCapability(CAPABILITIES.DEPARTMENT_MANAGE)
  @ScopedResource('department', 'id')
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
  @RequireCapability(CAPABILITIES.DEPARTMENT_MANAGE)
  @ScopedResource('department', 'id')
  @ApiOperation({ summary: 'حذف قسم سريري' })
  async deleteDepartment(@Param('id') id: string) {
    await this.prisma.department.delete({ where: { id } });
    return { success: true, message: 'تم حذف القسم' };
  }
}
