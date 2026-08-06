import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserAccountDto, AddUserToOrgDto, AssignRoleDto } from './dto/user-account.dto';
import { IAuthenticatedUser } from '../../common/interfaces';

@Injectable()
export class UserAccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
      organizations: {
        some: { organizationId, isActive: true },
      },
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { person: { nameAr: { contains: search, mode: 'insensitive' } } },
        { person: { nationalId: { contains: search } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.userAccount.count({ where }),
      this.prisma.userAccount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          person: true,
          organizations: {
            include: { organization: true },
          },
          userRoles: {
            where: { organizationId },
            include: { role: true },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const account = await this.prisma.userAccount.findFirst({
      where: { id, deletedAt: null },
      include: {
        person: true,
        organizations: {
          include: { organization: true },
        },
        userRoles: {
          include: { role: true, organization: true },
        },
        userPermissions: {
          include: { permission: true, organization: true },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('حساب المستخدم غير موجود');
    }

    return account;
  }

  async create(dto: CreateUserAccountDto, user?: IAuthenticatedUser) {
    // Check if email is already taken
    const existing = await this.prisma.userAccount.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مسجل بحساب آخر مسبقاً');
    }

    // Verify Person exists
    const person = await this.prisma.person.findUnique({
      where: { id: dto.personId },
    });
    if (!person) {
      throw new NotFoundException('الشخص غير موجود');
    }

    // Hash password if provided, or generate activation token
    let passwordHash = '';
    let activationToken: string | null = null;

    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    } else {
      activationToken = uuidv4();
      passwordHash = await bcrypt.hash(uuidv4(), 10); // temporary dummy password until activated
    }

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.userAccount.create({
        data: {
          personId: dto.personId,
          email: dto.email.toLowerCase(),
          username: dto.username || dto.email.toLowerCase(),
          passwordHash,
          activationToken,
          isEmailVerified: !!dto.password,
          createdById: user?.accountId,
        },
      });

      // Add to organization — written to both models to keep them in step
      await tx.userOrganization.create({
        data: {
          userAccountId: account.id,
          organizationId: dto.organizationId,
          isPrimary: true,
        },
      });
      await tx.organizationAssignment.create({
        data: {
          userAccountId: account.id,
          organizationId: dto.organizationId,
          isPrimary: true,
          isActive: true,
          assignmentType: 'permanent',
          sourceType: 'user_organization',
          createdById: user?.accountId,
        },
      });

      // Assign role if specified
      if (dto.roleCode) {
        const role = await tx.role.findUnique({
          where: { code: dto.roleCode },
        });
        if (role) {
          await tx.userRole.create({
            data: {
              userAccountId: account.id,
              roleId: role.id,
              organizationId: dto.organizationId,
              assignedById: user?.accountId,
            },
          });
        }
      }

      return {
        account,
        activationToken,
        activationLink: activationToken
          ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/activate?token=${activationToken}`
          : null,
      };
    });
  }

  async addUserToOrg(accountId: string, dto: AddUserToOrgDto, user?: IAuthenticatedUser) {
    const account = await this.findOne(accountId);

    // Membership check reads OrganizationAssignment, falling back to the legacy
    // row so an account that predates the migration is still detected.
    const existingAssignment = await this.prisma.organizationAssignment.findFirst({
      where: {
        userAccountId: accountId,
        organizationId: dto.organizationId,
        sourceType: { in: ['user_organization', 'user_role', 'manual'] },
      },
      select: { id: true },
    });
    const existingOrg = existingAssignment
      ?? (await this.prisma.userOrganization.findUnique({
        where: {
          userAccountId_organizationId: {
            userAccountId: accountId,
            organizationId: dto.organizationId,
          },
        },
      }));

    if (existingOrg) {
      throw new BadRequestException('المستخدم مرتبط بهذه الجهة مسبقاً');
    }

    return this.prisma.$transaction(async (tx) => {
      const userOrg = await tx.userOrganization.create({
        data: {
          userAccountId: accountId,
          organizationId: dto.organizationId,
          isPrimary: !!dto.isPrimary,
        },
      });
      if (dto.isPrimary) {
        // Only one assignment per user may be primary.
        await tx.organizationAssignment.updateMany({
          where: { userAccountId: accountId, isPrimary: true, isActive: true },
          data: { isPrimary: false },
        });
      }
      await tx.organizationAssignment.create({
        data: {
          userAccountId: accountId,
          organizationId: dto.organizationId,
          isPrimary: !!dto.isPrimary,
          isActive: true,
          assignmentType: 'permanent',
          sourceType: 'user_organization',
          createdById: user?.accountId,
        },
      });

      if (dto.roleCode) {
        const role = await tx.role.findUnique({ where: { code: dto.roleCode } });
        if (role) {
          await tx.userRole.create({
            data: {
              userAccountId: accountId,
              roleId: role.id,
              organizationId: dto.organizationId,
              assignedById: user?.accountId,
            },
          });
        }
      }

      return userOrg;
    });
  }

  async assignRole(dto: AssignRoleDto, user?: IAuthenticatedUser) {
    const existing = await this.prisma.userRole.findUnique({
      where: {
        userAccountId_roleId_organizationId: {
          userAccountId: dto.userAccountId,
          roleId: dto.roleId,
          organizationId: dto.organizationId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.userRole.create({
      data: {
        userAccountId: dto.userAccountId,
        roleId: dto.roleId,
        organizationId: dto.organizationId,
        assignedById: user?.accountId,
      },
    });
  }

  async removeRole(userAccountId: string, roleId: string, organizationId: string) {
    return this.prisma.userRole.delete({
      where: {
        userAccountId_roleId_organizationId: {
          userAccountId,
          roleId,
          organizationId,
        },
      },
    });
  }

  async toggleActive(id: string, user?: IAuthenticatedUser) {
    const account = await this.findOne(id);
    return this.prisma.userAccount.update({
      where: { id },
      data: {
        isActive: !account.isActive,
        updatedById: user?.accountId,
      },
    });
  }
}
