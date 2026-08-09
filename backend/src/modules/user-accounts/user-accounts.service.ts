import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserAccountDto, AddUserToOrgDto, AssignRoleDto } from './dto/user-account.dto';
import { IAuthenticatedUser } from '../../common/interfaces';
import { membershipWhere } from '../organization-assignments/organization-assignment.service';
import { roleScope } from '../../common/role-scope';

@Injectable()
export class UserAccountsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.migrateDeprecatedRoles();
    } catch (e) {
      console.warn('[UserAccountsService] Role migration warning:', e);
    }
  }

  private async migrateDeprecatedRoles() {
    const canonicalRoles = [
      { code: 'platform_owner', nameAr: 'مالك المنصة الوطنية', nameEn: 'Platform Owner' },
      { code: 'cluster_manager', nameAr: 'مشرف التدريب بالتجمع', nameEn: 'Cluster Training Manager' },
      { code: 'hospital_training_admin', nameAr: 'إدارة التدريب بالمستشفى', nameEn: 'Hospital Training Admin' },
      { code: 'department_head', nameAr: 'رئيس القسم السريري', nameEn: 'Department Head' },
      { code: 'training_supervisor', nameAr: 'المشرف التدريبي بالمستشفى', nameEn: 'Training Supervisor' },
      { code: 'university_administrator', nameAr: 'مسؤول الجامعة الموفدة', nameEn: 'University Administrator' },
      { code: 'academic_supervisor', nameAr: 'المشرف الأكاديمي', nameEn: 'Academic Supervisor' },
      { code: 'trainer', nameAr: 'المدرب السريري', nameEn: 'Clinical Trainer' },
      { code: 'trainee', nameAr: 'المتدرب', nameEn: 'Trainee' },
    ];

    for (const r of canonicalRoles) {
      await this.prisma.role.upsert({
        where: { code: r.code },
        update: { nameAr: r.nameAr, nameEn: r.nameEn },
        create: { code: r.code, nameAr: r.nameAr, nameEn: r.nameEn },
      });
    }

    const allRoles = await this.prisma.role.findMany();
    const roleIdByCode = new Map(allRoles.map((r) => [r.code, r.id]));

    // System admin -> platform_owner
    if (roleIdByCode.has('platform_owner') && roleIdByCode.has('system_admin')) {
      await this.prisma.userRole.updateMany({
        where: { roleId: roleIdByCode.get('system_admin')! },
        data: { roleId: roleIdByCode.get('platform_owner')! },
      });
    }

    // Cluster admin -> cluster_manager
    if (roleIdByCode.has('cluster_manager') && roleIdByCode.has('cluster_administrator')) {
      await this.prisma.userRole.updateMany({
        where: { roleId: roleIdByCode.get('cluster_administrator')! },
        data: { roleId: roleIdByCode.get('cluster_manager')! },
      });
    }

    // Hospital admin -> hospital_training_admin
    if (roleIdByCode.has('hospital_training_admin')) {
      const legacyHospRole = roleIdByCode.get('hospital_administrator');
      if (legacyHospRole) {
        await this.prisma.userRole.updateMany({
          where: { roleId: legacyHospRole },
          data: { roleId: roleIdByCode.get('hospital_training_admin')! },
        });
      }
      const aliasHospRole = roleIdByCode.get('hospitalAdmin');
      if (aliasHospRole) {
        await this.prisma.userRole.updateMany({
          where: { roleId: aliasHospRole },
          data: { roleId: roleIdByCode.get('hospital_training_admin')! },
        });
      }
    }

    // Academic affairs -> academic_supervisor
    if (roleIdByCode.has('academic_supervisor') && roleIdByCode.has('academic_affairs')) {
      await this.prisma.userRole.updateMany({
        where: { roleId: roleIdByCode.get('academic_affairs')! },
        data: { roleId: roleIdByCode.get('academic_supervisor')! },
      });
    }
  }

  async findAll(organizationId: string | null, page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (organizationId && organizationId !== 'all' && organizationId !== 'global') {
      where.AND = [membershipWhere(organizationId)];
    }

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
            // The organisation type is what lets a caller tell the hospital
            // assignment apart from the parent organisation one; without it
            // every assignment looks identical.
            include: {
              organization: {
                include: { organizationType: true, parent: { select: { id: true, nameAr: true } } },
              },
            },
          },
          userRoles: {
            ...(organizationId && organizationId !== 'all' && organizationId !== 'global' ? { where: { organizationId } } : {}),
            include: { role: true, organization: { include: { organizationType: true } } },
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
          include: {
            organization: {
              include: { organizationType: true, parent: { select: { id: true, nameAr: true } } },
            },
          },
        },
        userRoles: {
          include: { role: true, organization: { include: { organizationType: true } } },
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

  /**
   * Validates the account's scope against what its role actually needs.
   *
   * Three rules, all previously unenforced: a hospital role must name a
   * hospital, that hospital must belong to the organisation it was created
   * under, and a platform role is not narrowed by any organisation. Without
   * this a trainer could exist with no hospital, or a hospital administrator
   * could be attached to a hospital in a different cluster.
   */
  private async resolveScope(input: {
    roleCode?: string;
    organizationId?: string;
    hospitalId?: string;
  }): Promise<{ organizationId: string | null; hospitalId: string | null; scopeKind: string }> {
    const rule = roleScope(input.roleCode);

    if (rule.kind === 'platform') {
      // Platform roles are federation-wide; an organisation may still be
      // recorded for provenance but never limits what they can see.
      return {
        organizationId: input.organizationId ?? null,
        hospitalId: null,
        scopeKind: rule.kind,
      };
    }

    if (rule.requiresOrganization && !input.organizationId) {
      throw new BadRequestException(
        `الدور "${input.roleCode}" يتطلب تحديد الجهة (${rule.labelAr})`,
      );
    }

    const organization = input.organizationId
      ? await this.prisma.organization.findFirst({
          where: { id: input.organizationId, deletedAt: null },
          select: { id: true, parentId: true, organizationType: { select: { code: true } } },
        })
      : null;
    if (input.organizationId && !organization) {
      throw new NotFoundException('الجهة غير موجودة');
    }

    if (!rule.requiresHospital) {
      return { organizationId: input.organizationId ?? null, hospitalId: null, scopeKind: rule.kind };
    }

    // A hospital role may be created either by naming the hospital explicitly,
    // or by selecting the hospital itself as the organisation.
    const hospitalId =
      input.hospitalId ??
      (organization?.organizationType?.code === 'hospital' ? organization.id : undefined);

    if (!hospitalId) {
      throw new BadRequestException(
        `الدور "${input.roleCode}" يتطلب تحديد المستشفى (${rule.labelAr})`,
      );
    }

    const hospital = await this.prisma.organization.findFirst({
      where: { id: hospitalId, deletedAt: null },
      select: { id: true, parentId: true, organizationType: { select: { code: true } } },
    });
    if (!hospital) throw new NotFoundException('المستشفى غير موجود');
    if (hospital.organizationType?.code !== 'hospital') {
      throw new BadRequestException('الجهة المختارة كمستشفى ليست من نوع مستشفى');
    }

    // Cascading: the hospital must sit under the chosen organisation, unless the
    // hospital *is* the chosen organisation.
    const parentOrgId = input.organizationId ?? hospital.parentId;
    if (parentOrgId && hospital.id !== parentOrgId && hospital.parentId !== parentOrgId) {
      throw new BadRequestException('المستشفى المحدد لا يتبع الجهة المختارة');
    }

    return { organizationId: parentOrgId ?? hospital.parentId, hospitalId: hospital.id, scopeKind: rule.kind };
  }

  async create(dto: CreateUserAccountDto, user?: IAuthenticatedUser) {
    // Check if email is already taken
    const existing = await this.prisma.userAccount.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مسجل بحساب آخر مسبقاً');
    }

    const scope = await this.resolveScope({
      roleCode: dto.roleCode,
      organizationId: dto.organizationId,
      hospitalId: dto.hospitalId,
    });

    let personId = dto.personId;

    if (!personId) {
      let person = dto.nationalId
        ? await this.prisma.person.findUnique({ where: { nationalId: dto.nationalId } })
        : null;

      if (!person) {
        person = await this.prisma.person.findFirst({
          where: { email: dto.email.toLowerCase() },
        });
      }

      if (!person) {
        person = await this.prisma.person.create({
          data: {
            nationalId: dto.nationalId || null,
            nameAr: dto.nameAr || dto.email.split('@')[0],
            nameEn: dto.nameEn || null,
            email: dto.email.toLowerCase(),
            phone: dto.phone || null,
          },
        });
      }
      personId = person.id;
    } else {
      const person = await this.prisma.person.findUnique({
        where: { id: personId },
      });
      if (!person) {
        throw new NotFoundException('الشخص غير موجود');
      }
    }

    // Hash password if provided, or generate activation token
    let passwordHash = '';
    let activationToken: string | null = null;

    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    } else {
      activationToken = uuidv4();
      passwordHash = await bcrypt.hash(uuidv4(), 10);
    }

    // The account's home scope: its hospital when the role is hospital-scoped,
    // otherwise its organisation. Both come from `resolveScope`, so they are
    // guaranteed to be consistent with each other and with the role.
    const primaryOrgId = scope.hospitalId ?? scope.organizationId;
    if (!primaryOrgId) {
      throw new BadRequestException('تعذّر تحديد نطاق الحساب — يجب تحديد الجهة أو المستشفى');
    }

    if (dto.roleCode && ['hospital_training_admin', 'hospital_administrator', 'hospitalAdmin'].includes(dto.roleCode)) {
      const targetHospitalId = scope.hospitalId || primaryOrgId;
      const existingAdmin = await this.prisma.userRole.findFirst({
        where: {
          organizationId: targetHospitalId,
          role: { code: { in: ['hospital_training_admin', 'hospital_administrator', 'hospitalAdmin'] } },
          userAccount: { deletedAt: null, isActive: true },
        },
        select: { userAccount: { select: { email: true } } },
      });
      if (existingAdmin) {
        throw new BadRequestException(
          `يوجد بالفعل مسؤول تدريب مفعّل لهذا المستشفى (${existingAdmin.userAccount.email}) — يقتصر المستشفى الواحد على حساب إدارة تدريب واحد فقط`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.userAccount.create({
        data: {
          personId,
          email: dto.email.toLowerCase(),
          username: dto.username || dto.email.toLowerCase(),
          passwordHash,
          activationToken,
          isEmailVerified: !!dto.password,
          createdById: user?.accountId,
        },
      });

      // Add primary organization / hospital assignment
      await tx.userOrganization.create({
        data: {
          userAccountId: account.id,
          organizationId: primaryOrgId,
          isPrimary: true,
        },
      });
      await tx.organizationAssignment.create({
        data: {
          userAccountId: account.id,
          organizationId: primaryOrgId,
          isPrimary: true,
          isActive: true,
          assignmentType: 'permanent',
          sourceType: 'user_organization',
          createdById: user?.accountId,
        },
      });

      // A hospital-scoped account also belongs to the parent organisation, so
      // cluster-level screens still see them. Secondary, never primary.
      if (scope.hospitalId && scope.organizationId && scope.hospitalId !== scope.organizationId) {
        await tx.userOrganization.create({
          data: {
            userAccountId: account.id,
            organizationId: scope.organizationId,
            isPrimary: false,
          },
        });
        await tx.organizationAssignment.create({
          data: {
            userAccountId: account.id,
            organizationId: scope.organizationId,
            isPrimary: false,
            isActive: true,
            assignmentType: 'permanent',
            sourceType: 'user_organization',
            createdById: user?.accountId,
          },
        });
      }

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
              organizationId: primaryOrgId,
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
