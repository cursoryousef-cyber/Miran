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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const account = await this.prisma.userAccount.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        person: true,
        organizations: {
          where: { isActive: true },
          include: { organization: true },
        },
      },
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
        data: {
          loginAttempts: attempts,
          lockedUntil,
        },
      });

      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    await this.prisma.userAccount.update({
      where: { id: account.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const primaryOrg = account.organizations.find((uo) => uo.isPrimary) || account.organizations[0];
    if (!primaryOrg) {
      throw new ForbiddenException('المستخدم غير مرتبط بأي جهة تابعة للنظام');
    }

    const tokens = await this.generateTokens(account.id, account.personId, primaryOrg.organizationId, account.email);

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
        activeOrganization: {
          id: primaryOrg.organization.id,
          code: primaryOrg.organization.code,
          nameAr: primaryOrg.organization.nameAr,
          nameEn: primaryOrg.organization.nameEn,
        },
        availableOrganizations: account.organizations.map((uo) => ({
          id: uo.organization.id,
          code: uo.organization.code,
          nameAr: uo.organization.nameAr,
          nameEn: uo.organization.nameEn,
          isPrimary: uo.isPrimary,
        })),
      },
      tokens,
    };
  }

  async switchOrganization(user: IAuthenticatedUser, dto: SwitchOrgDto) {
    const userOrg = await this.prisma.userOrganization.findUnique({
      where: {
        userAccountId_organizationId: {
          userAccountId: user.accountId,
          organizationId: dto.organizationId,
        },
      },
      include: { organization: true },
    });

    if (!userOrg || !userOrg.isActive || !userOrg.organization.status) {
      throw new ForbiddenException('ليس لديك صلاحية الوصول لهذه الجهة');
    }

    const tokens = await this.generateTokens(
      user.accountId,
      user.personId,
      userOrg.organizationId,
      user.email,
    );

    return {
      activeOrganization: {
        id: userOrg.organization.id,
        code: userOrg.organization.code,
        nameAr: userOrg.organization.nameAr,
        nameEn: userOrg.organization.nameEn,
      },
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

      const tokens = await this.generateTokens(account.id, account.personId, payload.orgId, account.email);
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

  private async generateTokens(accountId: string, personId: string, orgId: string, email: string) {
    const payload = { sub: accountId, personId, orgId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET') || 'miran-access-secret-change-in-production-2024',
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'miran-refresh-secret-change-in-production-2024',
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d') as any,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: '15m',
    };
  }
}
