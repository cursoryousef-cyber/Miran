import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { IAuthenticatedUser } from '../../../common/interfaces';

export interface JwtPayload {
  sub: string; // userAccountId
  personId: string;
  orgId: string; // active organizationId
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'miran-access-secret-change-in-production-2024',
    });
  }

  async validate(payload: JwtPayload): Promise<IAuthenticatedUser> {
    const userAccount = await this.prisma.userAccount.findUnique({
      where: { id: payload.sub },
      include: {
        person: true,
        userRoles: {
          where: { organizationId: payload.orgId },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        userPermissions: {
          where: { organizationId: payload.orgId },
          include: { permission: true },
        },
      },
    });

    if (!userAccount || !userAccount.isActive) {
      throw new UnauthorizedException('الحساب غير موجود أو معطل');
    }

    // Resolve roles & permissions for active org
    const roleCodes = userAccount.userRoles.map((ur) => ur.role.code);
    const permissionSet = new Set<string>();

    // Add permissions from roles
    userAccount.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        permissionSet.add(rp.permission.code);
      });
    });

    // Add / remove direct user permissions
    userAccount.userPermissions.forEach((up) => {
      if (up.granted) {
        permissionSet.add(up.permission.code);
      } else {
        permissionSet.delete(up.permission.code);
      }
    });

    return {
      accountId: userAccount.id,
      personId: userAccount.personId,
      organizationId: payload.orgId,
      email: userAccount.email,
      nameAr: userAccount.person.nameAr,
      nameEn: userAccount.person.nameEn || undefined,
      roles: roleCodes,
      permissions: Array.from(permissionSet),
    };
  }
}
