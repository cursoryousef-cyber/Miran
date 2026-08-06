import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, RequireRoles } from '../../common/decorators';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationAssignmentService } from '../organization-assignments/organization-assignment.service';
import * as bcrypt from 'bcrypt';

@ApiTags('Org Members (إدارة أعضاء الجهة)')
@Controller('org-members')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class OrgMembersController {
  constructor(
    private prisma: PrismaService,
    private orgAssignments: OrganizationAssignmentService,
  ) {}

  // ─── قائمة أعضاء الجهة ───────────────────────────────────────────────────
  @Get()
  @RequireRoles('org_manager', 'academic_supervisor', 'platform_owner', 'cluster_administrator', 'training_director', 'hospital_administrator', 'university_administrator', 'training_supervisor', 'trainer')
  @ApiOperation({ summary: 'قائمة أعضاء الجهة مع أدوارهم' })
  async findAll(
    @CurrentUser() user: IAuthenticatedUser,
    @Query('roleCode') roleCode?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    // Membership resolved from OrganizationAssignment (UserOrganization fallback).
    const { members: rows, total } = await this.orgAssignments.findMembershipsInOrg(
      user.organizationId,
      { skip: page ? (parseInt(page) - 1) * 20 : 0, take: 50 },
    );

    let members = rows.map((m) => ({
      id: m.userAccountId,
      email: m.userAccount.email,
      username: m.userAccount.username,
      isActive: m.isActive && m.userAccount.isActive,
      nameAr: m.userAccount.person?.nameAr,
      nameEn: m.userAccount.person?.nameEn,
      nationalId: m.userAccount.person?.nationalId,
      phone: m.userAccount.person?.phone,
      roles: m.userAccount.userRoles.map((ur) => ({ code: ur.role.code, nameAr: ur.role.nameAr, id: ur.role.id })),
      isPrimary: m.isPrimary,
    }));

    if (roleCode) {
      members = members.filter((m) => m.roles.some((r) => r.code === roleCode));
    }

    return { data: members, meta: { total, page: parseInt(page || '1'), limit: 50 } };
  }

  // ─── إضافة عضو جديد ──────────────────────────────────────────────────────
  @Post()
  @RequireRoles('org_manager', 'platform_owner', 'cluster_administrator', 'training_director', 'hospital_administrator', 'university_administrator')
  @ApiOperation({ summary: 'إضافة عضو جديد للجهة' })
  async create(@CurrentUser() user: IAuthenticatedUser, @Body() dto: any) {
    const passwordHash = await bcrypt.hash(dto.password || 'Miran@Admin2024!', 10);

    // إنشاء/تحديث Person
    const person = await this.prisma.person.upsert({
      where: { nationalId: dto.nationalId },
      create: {
        nationalId: dto.nationalId,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        email: dto.email,
        phone: dto.phone,
      },
      update: { nameAr: dto.nameAr, nameEn: dto.nameEn, phone: dto.phone },
    });

    // إنشاء UserAccount
    let account = await this.prisma.userAccount.findUnique({ where: { email: dto.email } });
    if (!account) {
      account = await this.prisma.userAccount.create({
        data: {
          personId: person.id,
          email: dto.email,
          username: dto.email.split('@')[0],
          passwordHash,
          isEmailVerified: true,
          isActive: true,
        },
      });
    }

    // ربط بالجهة — يُكتب في النموذجين للحفاظ على التوافق
    await this.prisma.userOrganization.upsert({
      where: { userAccountId_organizationId: { userAccountId: account.id, organizationId: user.organizationId } },
      create: { userAccountId: account.id, organizationId: user.organizationId, isPrimary: true },
      update: { isActive: true },
    });
    await this.orgAssignments.upsertMembership({
      userAccountId: account.id,
      organizationId: user.organizationId,
      isPrimary: true,
      createdById: user.accountId,
    });

    // تعيين الدور
    if (dto.roleCode) {
      const role = await this.prisma.role.findUnique({ where: { code: dto.roleCode } });
      if (role) {
        await this.prisma.userRole.upsert({
          where: { userAccountId_roleId_organizationId: { userAccountId: account.id, roleId: role.id, organizationId: user.organizationId } },
          create: { userAccountId: account.id, roleId: role.id, organizationId: user.organizationId, assignedById: user.accountId },
          update: {},
        });
      }
    }

    // إنشاء TraineeProfile إذا كان المتدرب
    if (dto.roleCode === 'trainee' && dto.traineeNumber) {
      const existing = await this.prisma.traineeProfile.findFirst({ where: { personId: person.id } });
      if (!existing) {
        await this.prisma.traineeProfile.create({
          data: {
            personId: person.id,
            organizationId: user.organizationId,
            traineeNumber: dto.traineeNumber,
            level: dto.level || 'intern',
            specialtyAr: dto.specialtyAr || 'طب بشري',
            applicationStatus: 'approved',
            cardStatus: 'active',
            cardUuid: `CARD-${dto.traineeNumber}`,
            photoApproved: true,
          },
        });
      }
    }

    // إنشاء TrainerProfile إذا كان المدرب
    if (dto.roleCode === 'trainer' && dto.departmentId) {
      const existing = await this.prisma.trainerProfile.findFirst({ where: { personId: person.id } });
      if (!existing) {
        await this.prisma.trainerProfile.create({
          data: {
            personId: person.id,
            organizationId: user.organizationId,
            departmentId: dto.departmentId,
            titleAr: dto.titleAr || 'استشاري',
            maxTrainees: dto.maxTrainees || 10,
          },
        });
      }
    }

    return {
      success: true,
      message: `تم إنشاء حساب ${dto.nameAr} بنجاح`,
      accountId: account.id,
    };
  }

  // ─── تعديل عضو ───────────────────────────────────────────────────────────
  @Patch(':id')
  @RequireRoles('org_manager', 'platform_owner', 'cluster_administrator', 'training_director', 'hospital_administrator', 'university_administrator')
  @ApiOperation({ summary: 'تعديل بيانات عضو' })
  async update(@Param('id') accountId: string, @CurrentUser() user: IAuthenticatedUser, @Body() dto: any) {
    const account = await this.prisma.userAccount.findUnique({
      where: { id: accountId },
      include: { person: true },
    });
    if (!account) return { message: 'الحساب غير موجود' };

    // تحديث بيانات Person
    await this.prisma.person.update({
      where: { id: account.personId },
      data: {
        nameAr: dto.nameAr || account.person.nameAr,
        nameEn: dto.nameEn,
        phone: dto.phone,
      },
    });

    // تعيين دور جديد إن وُجد
    if (dto.roleCode) {
      const role = await this.prisma.role.findUnique({ where: { code: dto.roleCode } });
      if (role) {
        await this.prisma.userRole.upsert({
          where: { userAccountId_roleId_organizationId: { userAccountId: accountId, roleId: role.id, organizationId: user.organizationId } },
          create: { userAccountId: accountId, roleId: role.id, organizationId: user.organizationId, assignedById: user.accountId },
          update: {},
        });
      }
    }

    return { success: true, message: 'تم تعديل البيانات بنجاح' };
  }

  // ─── تعطيل عضو ───────────────────────────────────────────────────────────
  @Delete(':id')
  @RequireRoles('org_manager', 'platform_owner', 'cluster_administrator', 'hospital_administrator')
  @ApiOperation({ summary: 'تعطيل حساب عضو' })
  async deactivate(@Param('id') accountId: string, @CurrentUser() user: IAuthenticatedUser) {
    await this.prisma.userOrganization.update({
      where: { userAccountId_organizationId: { userAccountId: accountId, organizationId: user.organizationId } },
      data: { isActive: false },
    });
    await this.orgAssignments.setMembershipActive(accountId, user.organizationId, false);
    return { success: true, message: 'تم تعطيل الحساب من الجهة' };
  }

  // ─── تفعيل عضو ───────────────────────────────────────────────────────────
  @Patch(':id/activate')
  @RequireRoles('org_manager', 'platform_owner', 'cluster_administrator', 'hospital_administrator')
  @ApiOperation({ summary: 'تفعيل حساب عضو' })
  async activate(@Param('id') accountId: string, @CurrentUser() user: IAuthenticatedUser) {
    await this.prisma.userOrganization.update({
      where: { userAccountId_organizationId: { userAccountId: accountId, organizationId: user.organizationId } },
      data: { isActive: true },
    });
    await this.orgAssignments.setMembershipActive(accountId, user.organizationId, true);
    return { success: true, message: 'تم إعادة تفعيل الحساب' };
  }

  // ─── إزالة دور من عضو ─────────────────────────────────────────────────────
  @Delete(':id/roles/:roleCode')
  @RequireRoles('org_manager', 'platform_owner')
  @ApiOperation({ summary: 'إزالة دور من عضو' })
  async removeRole(@Param('id') accountId: string, @Param('roleCode') roleCode: string, @CurrentUser() user: IAuthenticatedUser) {
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) return { message: 'الدور غير موجود' };

    await this.prisma.userRole.deleteMany({
      where: { userAccountId: accountId, roleId: role.id, organizationId: user.organizationId },
    });
    return { success: true, message: 'تم إزالة الدور' };
  }

  // ─── قائمة الأدوار المتاحة ────────────────────────────────────────────────
  @Get('roles/available')
  @RequireRoles('org_manager', 'academic_supervisor', 'platform_owner', 'cluster_administrator', 'training_director', 'hospital_administrator', 'university_administrator')
  @ApiOperation({ summary: 'قائمة الأدوار المتاحة للتعيين' })
  async getAvailableRoles() {
    const roles = await this.prisma.role.findMany({
      where: { isActive: true, code: { in: ['org_manager', 'academic_supervisor', 'trainer', 'trainee'] } },
      select: { id: true, code: true, nameAr: true, nameEn: true, hierarchyLevel: true },
      orderBy: { hierarchyLevel: 'desc' },
    });
    return { data: roles };
  }

  // ─── قائمة الأقسام ───────────────────────────────────────────────────────
  @Get('departments')
  @RequireRoles('org_manager', 'academic_supervisor', 'platform_owner', 'cluster_administrator', 'training_director', 'hospital_administrator', 'university_administrator', 'training_supervisor', 'trainer')
  @ApiOperation({ summary: 'قائمة الأقسام في الجهة' })
  async getDepartments(@CurrentUser() user: IAuthenticatedUser) {
    const departments = await this.prisma.department.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, nameAr: true, nameEn: true, code: true },
    });
    return { data: departments };
  }
}
