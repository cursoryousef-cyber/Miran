import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { RequireRoles } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLE_SCOPES } from '../../common/role-scope';

@ApiTags('Dynamic RBAC (إدارة الأدوار والصلاحيات الديناميكية)')
@Controller('roles-permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class RolesPermissionsController {
  constructor(private prisma: PrismaService) {}

  @Get('roles')
  @RequireRoles('platform_owner', 'org_manager')
  @ApiOperation({ summary: 'قائمة الأدوار المتاحة والمسجلة' })
  async getRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { hierarchyLevel: 'desc' },
    });
    return { data: roles };
  }

  @Get('role-scopes')
  @ApiOperation({
    summary: 'عقد نطاق الأدوار — ما يتطلبه كل دور من جهة/مستشفى (مصدر موحّد للواجهة والخادم)',
  })
  async getRoleScopes() {
    return {
      data: Object.entries(ROLE_SCOPES).map(([code, rule]) => ({ code, ...rule })),
    };
  }

  @Get('permissions')
  @RequireRoles('platform_owner', 'org_manager')
  @ApiOperation({ summary: 'قائمة الصلاحيات المتاحة بالنظام' })
  async getPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { module: 'asc' },
    });
    return { data: permissions };
  }

  @Post('roles')
  @RequireRoles('platform_owner')
  @ApiOperation({ summary: 'إنشاء دور ديناميكي جديد' })
  async createRole(@Body() dto: { code: string; nameAr: string; nameEn?: string; descriptionAr?: string; hierarchyLevel?: number; permissions?: string[] }) {
    const role = await this.prisma.role.create({
      data: {
        code: dto.code,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn || dto.code,
        descriptionAr: dto.descriptionAr,
        hierarchyLevel: dto.hierarchyLevel || 1,
        isSystem: false,
      },
    });

    if (dto.permissions && dto.permissions.length > 0) {
      for (const permCode of dto.permissions) {
        const perm = await this.prisma.permission.findUnique({ where: { code: permCode } });
        if (perm) {
          await this.prisma.rolePermission.create({
            data: { roleId: role.id, permissionId: perm.id },
          });
        }
      }
    }

    return { success: true, role };
  }

  @Patch('roles/:id')
  @RequireRoles('platform_owner')
  @ApiOperation({ summary: 'تعديل بيانات ورخص دور ديناميكي' })
  async updateRole(@Param('id') id: string, @Body() dto: { nameAr?: string; descriptionAr?: string; permissions?: string[] }) {
    const role = await this.prisma.role.update({
      where: { id },
      data: {
        nameAr: dto.nameAr,
        descriptionAr: dto.descriptionAr,
      },
    });

    if (dto.permissions) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      for (const permCode of dto.permissions) {
        const perm = await this.prisma.permission.findUnique({ where: { code: permCode } });
        if (perm) {
          await this.prisma.rolePermission.create({
            data: { roleId: id, permissionId: perm.id },
          });
        }
      }
    }

    return { success: true, role };
  }

  @Delete('roles/:id')
  @RequireRoles('platform_owner')
  @ApiOperation({ summary: 'حذف دور ديناميكي غير سيادي' })
  async deleteRole(@Param('id') id: string) {
    await this.prisma.role.delete({ where: { id } });
    return { success: true, message: 'تم حذف الدور بنجاح' };
  }
}
