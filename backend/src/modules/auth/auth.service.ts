import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, SwitchOrgDto, RefreshTokenDto, ActivateAccountDto } from './dto/auth.dto';
import { IAuthenticatedUser } from '../../common/interfaces';
import { OrganizationAssignmentService } from '../organization-assignments/organization-assignment.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private orgAssignments: OrganizationAssignmentService,
  ) {}

  // ── Helper: جلب أدوار وصلاحيات المستخدم لجهة محددة ──────────────────────
  private async getRolesAndPermissions(accountId: string, orgId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userAccountId: accountId, organizationId: orgId },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });

    const roles = userRoles.map((ur) => ur.role.code);

    const permissionsSet = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionsSet.add(rp.permission.code);
      }
    }

    // إضافة الصلاحيات المباشرة للمستخدم
    const directPermissions = await this.prisma.userPermission.findMany({
      where: { userAccountId: accountId, organizationId: orgId, granted: true },
      include: { permission: true },
    });
    for (const dp of directPermissions) {
      permissionsSet.add(dp.permission.code);
    }

    return { roles, permissions: Array.from(permissionsSet) };
  }

  async login(dto: LoginDto) {
    const account = await this.prisma.userAccount.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { person: true },
    });

    if (!account) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    if (!account.isActive) {
      throw new ForbiddenException('هذا الحساب غير نشط. يرجى التواصل مع مسؤول النظام.');
    }

    if (account.lockedUntil && account.lockedUntil > new Date()) {
      throw new ForbiddenException('الحساب مقفل مؤقتاً بسبب تكرار المحاولات الخاطئة');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, account.passwordHash);
    if (!isPasswordValid) {
      const attempts = account.loginAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await this.prisma.userAccount.update({
        where: { id: account.id },
        data: { loginAttempts: attempts, lockedUntil },
      });

      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    await this.prisma.userAccount.update({
      where: { id: account.id },
      data: { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    // Multi-Org Resolution: OrganizationAssignment is the source of truth;
    // UserOrganization remains the fallback for users with no assignments.
    const orgContext = await this.orgAssignments.resolveOrgContext(account.id, { activeOnly: true });
    const primaryOrg = orgContext.active;

    if (!primaryOrg) {
      throw new ForbiddenException('المستخدم غير مرتبط بأي جهة تابعة للنظام');
    }

    // جلب الأدوار والصلاحيات للجهة الأساسية
    const { roles, permissions } = await this.getRolesAndPermissions(account.id, primaryOrg.organization.id);

    const tokens = await this.generateTokens(
      account.id, account.personId, primaryOrg.organization.id, account.email, roles, permissions,
    );

    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.userAccount.update({
      where: { id: account.id },
      data: { refreshTokenHash },
    });

    return {
      user: {
        id: account.id,
        personId: account.personId,
        nameAr: account.person.nameAr,
        nameEn: account.person.nameEn,
        email: account.email,
        // ─── RBAC: الأدوار والصلاحيات في الجهة النشطة ───
        roles,
        permissions,
        // ─────────────────────────────────────────────────
        activeOrganization: {
          id: primaryOrg.organization.id,
          code: primaryOrg.organization.code,
          nameAr: primaryOrg.organization.nameAr,
          nameEn: primaryOrg.organization.nameEn,
        },
        availableOrganizations: orgContext.available.map((entry) => ({
          id: entry.organization.id,
          code: entry.organization.code,
          nameAr: entry.organization.nameAr,
          nameEn: entry.organization.nameEn,
          isPrimary: entry.isPrimary,
        })),
      },
      tokens,
    };
  }

  async switchOrganization(user: IAuthenticatedUser, dto: SwitchOrgDto) {
    // Access decided by OrganizationAssignment, with UserOrganization as fallback.
    const allowed = await this.orgAssignments.canAccessOrg(user.accountId, dto.organizationId);
    const organization = allowed
      ? await this.prisma.organization.findUnique({ where: { id: dto.organizationId } })
      : null;

    if (!allowed || !organization || !organization.status) {
      throw new ForbiddenException('ليس لديك صلاحية الوصول لهذه الجهة');
    }

    // إعادة حساب الأدوار للجهة الجديدة
    const { roles, permissions } = await this.getRolesAndPermissions(user.accountId, organization.id);

    const tokens = await this.generateTokens(
      user.accountId, user.personId, organization.id, user.email, roles, permissions,
    );

    return {
      activeOrganization: {
        id: organization.id,
        code: organization.code,
        nameAr: organization.nameAr,
        nameEn: organization.nameEn,
      },
      roles,
      permissions,
      tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'miran-refresh-secret-change-in-production-2024',
      });

      const account = await this.prisma.userAccount.findUnique({
        where: { id: payload.sub },
      });

      if (!account || !account.refreshTokenHash) {
        throw new UnauthorizedException('رمز التحديث غير صالح');
      }

      const isTokenValid = await bcrypt.compare(dto.refreshToken, account.refreshTokenHash);
      if (!isTokenValid) {
        throw new UnauthorizedException('رمز التحديث انتهت صلاحيته');
      }

      // إعادة حساب الأدوار عند التحديث
      const { roles, permissions } = await this.getRolesAndPermissions(account.id, payload.orgId);
      const tokens = await this.generateTokens(account.id, account.personId, payload.orgId, account.email, roles, permissions);
      const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);

      await this.prisma.userAccount.update({
        where: { id: account.id },
        data: { refreshTokenHash: newRefreshTokenHash },
      });

      return tokens;
    } catch {
      throw new UnauthorizedException('رمز التحديث غير صالح أو منتهي الصلاحية');
    }
  }

  async getProfile(user: IAuthenticatedUser) {
    const account = await this.prisma.userAccount.findUnique({
      where: { id: user.accountId },
      include: { person: true },
    });

    if (!account) {
      throw new UnauthorizedException('الحساب غير موجود');
    }

    const activeOrgId = user.organizationId;
    const { roles, permissions } = await this.getRolesAndPermissions(account.id, activeOrgId);

    // Historical memberships included, matching the legacy unfiltered join.
    const orgContext = await this.orgAssignments.resolveOrgContext(account.id, { activeOnly: false });

    const activeEntry =
      orgContext.available.find((e) => e.organization.id === activeOrgId) ?? orgContext.available[0];

    const availableOrganizations = orgContext.available.map((entry) => ({
      id: entry.organization.id,
      code: entry.organization.code,
      nameAr: entry.organization.nameAr,
      nameEn: entry.organization.nameEn,
      type: entry.organization.organizationType?.code || 'hospital',
      logoUrl: entry.organization.logoUrl,
    }));

    return {
      user: {
        id: account.id,
        personId: account.personId,
        email: account.email,
        nameAr: account.person.nameAr,
        nameEn: account.person.nameEn,
        primaryRole: roles[0] || 'trainee',
        roles,
        permissions,
        activeOrganization: activeEntry ? {
          id: activeEntry.organization.id,
          code: activeEntry.organization.code,
          nameAr: activeEntry.organization.nameAr,
          nameEn: activeEntry.organization.nameEn,
          type: activeEntry.organization.organizationType?.code || 'hospital',
          logoUrl: activeEntry.organization.logoUrl,
        } : null,
        availableOrganizations,
      },
    };
  }

  async activateAccount(dto: ActivateAccountDto) {
    const account = await this.prisma.userAccount.findFirst({
      where: { activationToken: dto.token },
    });

    if (!account) {
      throw new BadRequestException('رمز التفعيل غير صحيح أو تم استخدامه مسبقاً');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.userAccount.update({
      where: { id: account.id },
      data: {
        passwordHash,
        isActive: true,
        isEmailVerified: true,
        activationToken: null,
        activatedAt: new Date(),
      },
    });

    return { success: true, message: 'تم تفعيل الحساب وتعيين كلمة المرور بنجاح' };
  }

  private async generateTokens(
    accountId: string,
    personId: string,
    orgId: string,
    email: string,
    roles: string[],
    permissions: string[],
  ) {
    // ─── roles + permissions مدمجة في JWT لتجنب DB query في كل request ───
    const payload = { sub: accountId, personId, orgId, email, roles, permissions };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET') || 'miran-access-secret-change-in-production-2024',
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'miran-refresh-secret-change-in-production-2024',
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d') as any,
    });

    return { accessToken, refreshToken, expiresIn: '15m' };
  }
}
