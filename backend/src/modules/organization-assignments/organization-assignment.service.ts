import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Assignment sources that confer *account membership* in an organization —
 * i.e. the right to sign in against it and switch into it.
 *
 * Profile-derived assignments (trainer_profile / trainee_profile) are
 * deliberately excluded: holding a clinical profile at a hospital records where
 * a person trains or teaches, not that their account is a member of that org.
 * Those rows stay in the table for the hospital/trainer queries that legitimately
 * ask "who works here", but they must not widen the auth surface — the legacy
 * model resolved membership from UserOrganization alone, and this keeps the
 * resolved membership identical to it.
 */
const MEMBERSHIP_SOURCES = ['user_organization', 'user_role', 'manual'];

@Injectable()
export class OrganizationAssignmentService {
  private readonly logger = new Logger(OrganizationAssignmentService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Compatibility: resolve the active organization for a user ──────────────

  /**
   * Returns the active organization ID for a user.
   * Reads from OrganizationAssignment first; falls back to UserOrganization for
   * users not yet migrated.
   */
  async getActiveOrgId(userAccountId: string): Promise<string | null> {
    const oa = await this.prisma.organizationAssignment.findFirst({
      where: { userAccountId, isActive: true, isPrimary: true },
      select: { organizationId: true },
    });
    if (oa) return oa.organizationId;

    // Legacy fallback
    const uo = await this.prisma.userOrganization.findFirst({
      where: { userAccountId, isActive: true, isPrimary: true },
      select: { organizationId: true },
    });
    return uo?.organizationId ?? null;
  }

  /**
   * Resolves a user's organization context — the active org plus every org they
   * can reach — from OrganizationAssignment, falling back to UserOrganization
   * when the user has no assignment rows at all.
   *
   * The source decision is all-or-nothing per user so a caller never sees a list
   * half-built from each model. Returned organizations are full records, so
   * callers can shape responses exactly as they did against the legacy join.
   *
   * @param activeOnly restrict to currently-active memberships (login) or
   *                   include historical ones (profile), matching legacy scoping.
   */
  async resolveOrgContext(
    userAccountId: string,
    opts: { activeOnly: boolean },
  ): Promise<{
    active: { organization: any; isPrimary: boolean } | null;
    available: Array<{ organization: any; isPrimary: boolean }>;
    source: 'assignment' | 'legacy';
  }> {
    const orgInclude = { include: { organizationType: true } } as const;

    const assignments = await this.prisma.organizationAssignment.findMany({
      where: {
        userAccountId,
        sourceType: { in: MEMBERSHIP_SOURCES },
        ...(opts.activeOnly ? { isActive: true } : {}),
      },
      include: { organization: orgInclude },
      orderBy: [{ isPrimary: 'desc' }, { startDate: 'asc' }],
    });

    if (assignments.length > 0) {
      // A user may hold several assignments in one org over time; collapse to one
      // entry per org, preferring the primary.
      const byOrg = new Map<string, { organization: any; isPrimary: boolean }>();
      for (const a of assignments) {
        const existing = byOrg.get(a.organizationId);
        if (!existing || (a.isPrimary && !existing.isPrimary)) {
          byOrg.set(a.organizationId, { organization: a.organization, isPrimary: a.isPrimary });
        }
      }
      const available = [...byOrg.values()];
      const active = available.find((e) => e.isPrimary) ?? available[0] ?? null;
      return { active, available, source: 'assignment' };
    }

    // Legacy fallback — mirrors the original UserOrganization resolution exactly.
    const userOrgs = await this.prisma.userOrganization.findMany({
      where: { userAccountId, ...(opts.activeOnly ? { isActive: true } : {}) },
      include: { organization: orgInclude },
    });
    const available = userOrgs.map((uo) => ({
      organization: uo.organization,
      isPrimary: uo.isPrimary,
    }));
    const active = available.find((e) => e.isPrimary) ?? available[0] ?? null;
    return { active, available, source: 'legacy' };
  }

  /**
   * Whether a user may act within an organization — assignment first, legacy
   * fallback. Used to authorize organization switching.
   */
  async canAccessOrg(userAccountId: string, organizationId: string): Promise<boolean> {
    const assignment = await this.prisma.organizationAssignment.findFirst({
      where: { userAccountId, organizationId, isActive: true, sourceType: { in: MEMBERSHIP_SOURCES } },
      select: { id: true },
    });
    if (assignment) return true;

    const anyAssignment = await this.prisma.organizationAssignment.findFirst({
      where: { userAccountId, sourceType: { in: MEMBERSHIP_SOURCES } },
      select: { id: true },
    });
    // Only consult the legacy model for users with no assignments at all.
    if (anyAssignment) return false;

    const uo = await this.prisma.userOrganization.findUnique({
      where: { userAccountId_organizationId: { userAccountId, organizationId } },
      select: { isActive: true },
    });
    return !!uo?.isActive;
  }

  /**
   * Returns all active assignment rows for a user (may be multiple orgs).
   */
  async getAssignments(userAccountId: string) {
    return this.prisma.organizationAssignment.findMany({
      where: { userAccountId, isActive: true },
      include: {
        organization: { select: { id: true, nameAr: true, nameEn: true } },
        department: { select: { id: true, nameAr: true, nameEn: true } },
        role: { select: { id: true, code: true, nameAr: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { startDate: 'desc' }],
    });
  }

  /**
   * Returns all users with an active assignment in an organization,
   * optionally filtered by role code.
   */
  async getMembersInOrg(organizationId: string, roleCode?: string) {
    const assignments = await this.prisma.organizationAssignment.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(roleCode ? { role: { code: roleCode } } : {}),
      },
      include: {
        userAccount: {
          include: {
            person: { select: { nameAr: true, nameEn: true, nationalId: true, phone: true } },
            userRoles: {
              where: { organizationId },
              include: { role: true },
            },
          },
        },
        department: { select: { id: true, nameAr: true } },
        role: { select: { id: true, code: true, nameAr: true } },
      },
    });
    return assignments;
  }

  // ─── Assignment lifecycle ────────────────────────────────────────────────────

  async createAssignment(data: {
    userAccountId: string;
    organizationId: string;
    departmentId?: string;
    roleId?: string;
    assignmentType?: string;
    isPrimary?: boolean;
    startDate?: Date;
    endDate?: Date;
    reason?: string;
    notes?: string;
    createdById?: string;
  }) {
    if (data.isPrimary) {
      // Demote other primary assignments for same user
      await this.prisma.organizationAssignment.updateMany({
        where: { userAccountId: data.userAccountId, isPrimary: true, isActive: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.organizationAssignment.create({
      data: {
        userAccountId: data.userAccountId,
        organizationId: data.organizationId,
        departmentId: data.departmentId ?? null,
        roleId: data.roleId ?? null,
        assignmentType: data.assignmentType ?? 'permanent',
        isPrimary: data.isPrimary ?? false,
        isActive: true,
        startDate: data.startDate ?? new Date(),
        endDate: data.endDate ?? null,
        reason: data.reason ?? null,
        notes: data.notes ?? null,
        sourceType: 'manual',
        createdById: data.createdById ?? null,
      },
    });
  }

  /**
   * Transfer a user: close the current active primary assignment, open a new one.
   * Writes an AuditLog entry capturing the before/after state.
   */
  async transferUser(params: {
    userAccountId: string;
    toOrganizationId: string;
    toDepartmentId?: string;
    toRoleId?: string;
    assignmentType?: string;
    transferDate?: Date;
    reason: string;
    performedById: string;
    notes?: string;
  }) {
    const current = await this.prisma.organizationAssignment.findFirst({
      where: { userAccountId: params.userAccountId, isPrimary: true, isActive: true },
    });

    return this.prisma.$transaction(async (tx) => {
      if (current) {
        await tx.organizationAssignment.update({
          where: { id: current.id },
          data: { isActive: false, isPrimary: false, endDate: params.transferDate ?? new Date() },
        });
      }

      const next = await tx.organizationAssignment.create({
        data: {
          userAccountId: params.userAccountId,
          organizationId: params.toOrganizationId,
          departmentId: params.toDepartmentId ?? null,
          roleId: params.toRoleId ?? null,
          assignmentType: params.assignmentType ?? 'permanent',
          isPrimary: true,
          isActive: true,
          startDate: params.transferDate ?? new Date(),
          reason: params.reason,
          notes: params.notes ?? null,
          sourceType: 'manual',
          createdById: params.performedById,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'user_transferred',
          entityType: 'OrganizationAssignment',
          entityId: next.id,
          organizationId: params.toOrganizationId,
          actorId: params.performedById,
          oldValues: current
            ? ({
                organizationId: current.organizationId,
                departmentId: current.departmentId,
                roleId: current.roleId,
              } as object)
            : undefined,
          newValues: {
            organizationId: params.toOrganizationId,
            departmentId: params.toDepartmentId ?? null,
            roleId: params.toRoleId ?? null,
            reason: params.reason,
          },
        },
      });

      return next;
    });
  }

  // ─── Backfill ────────────────────────────────────────────────────────────────

  /**
   * Backfills OrganizationAssignment from the four legacy org sources:
   * UserOrganization, UserRole, TrainerProfile, TraineeProfile.
   *
   * Idempotent — keyed on (userAccountId, organizationId), so re-running makes
   * no further changes. Never writes to or deletes any legacy row.
   *
   * Exactly one active assignment per user is marked primary, chosen by
   * replaying auth.service's own resolution (first isPrimary among active
   * UserOrganization rows, else the first) so that no user's active
   * organization changes as a result of the migration.
   */
  async backfill(): Promise<{
    created: number;
    skipped: number;
    primariesSet: number;
    unassignableTraineeProfiles: string[];
  }> {
    this.logger.log('Starting OrganizationAssignment backfill...');

    const existing = await this.prisma.organizationAssignment.findMany({
      select: { userAccountId: true, organizationId: true },
    });
    const seen = new Set(existing.map((e) => `${e.userAccountId}|${e.organizationId}`));

    let created = 0;
    let skipped = 0;

    const createIfNew = async (data: {
      userAccountId: string;
      organizationId: string;
      departmentId?: string | null;
      roleId?: string | null;
      isActive: boolean;
      startDate: Date;
      endDate?: Date | null;
      sourceType: string;
      sourceId?: string | null;
    }) => {
      const key = `${data.userAccountId}|${data.organizationId}`;
      if (seen.has(key)) {
        skipped++;
        return;
      }
      seen.add(key);
      await this.prisma.organizationAssignment.create({
        data: {
          userAccountId: data.userAccountId,
          organizationId: data.organizationId,
          departmentId: data.departmentId ?? null,
          roleId: data.roleId ?? null,
          assignmentType: 'permanent',
          isPrimary: false, // resolved in a dedicated pass below
          isActive: data.isActive,
          startDate: data.startDate,
          endDate: data.endDate ?? null,
          sourceType: data.sourceType,
          sourceId: data.sourceId ?? null,
        },
      });
      created++;
    };

    // Role lookup: (userAccountId, organizationId) -> roleId
    const allRoles = await this.prisma.userRole.findMany();
    const roleFor = (userAccountId: string, organizationId: string) =>
      allRoles.find((r) => r.userAccountId === userAccountId && r.organizationId === organizationId)?.roleId ?? null;

    // Department lookup from TrainerProfile: (userAccountId, organizationId) -> departmentId
    const trainerProfiles = await this.prisma.trainerProfile.findMany({
      include: { person: { select: { userAccounts: { select: { id: true } } } } },
    });
    const deptFor = (userAccountId: string, organizationId: string) =>
      trainerProfiles.find(
        (tp) =>
          tp.organizationId === organizationId &&
          tp.person.userAccounts.some((ua) => ua.id === userAccountId),
      )?.departmentId ?? null;

    // ── Source 1: UserOrganization (primary membership record) ──
    const userOrgs = await this.prisma.userOrganization.findMany();
    for (const uo of userOrgs) {
      await createIfNew({
        userAccountId: uo.userAccountId,
        organizationId: uo.organizationId,
        departmentId: deptFor(uo.userAccountId, uo.organizationId),
        roleId: roleFor(uo.userAccountId, uo.organizationId),
        isActive: uo.isActive,
        startDate: uo.joinedAt,
        endDate: uo.leftAt,
        sourceType: 'user_organization',
        sourceId: uo.id,
      });
    }

    // ── Source 2: UserRole — covers users holding a role in an org with no
    //    UserOrganization row (otherwise silently dropped by the migration) ──
    for (const ur of allRoles) {
      await createIfNew({
        userAccountId: ur.userAccountId,
        organizationId: ur.organizationId,
        departmentId: deptFor(ur.userAccountId, ur.organizationId),
        roleId: ur.roleId,
        isActive: true,
        startDate: ur.assignedAt,
        sourceType: 'user_role',
      });
    }

    // ── Source 3: TrainerProfile — trainers whose profile org has no UO row ──
    for (const tp of trainerProfiles) {
      for (const ua of tp.person.userAccounts) {
        await createIfNew({
          userAccountId: ua.id,
          organizationId: tp.organizationId,
          departmentId: tp.departmentId,
          roleId: roleFor(ua.id, tp.organizationId),
          isActive: tp.isActive,
          startDate: tp.createdAt,
          sourceType: 'trainer_profile',
          sourceId: tp.id,
        });
      }
    }

    // ── Source 4: TraineeProfile ──
    const traineeProfiles = await this.prisma.traineeProfile.findMany({
      include: { person: { select: { userAccounts: { select: { id: true } } } } },
    });
    const unassignableTraineeProfiles: string[] = [];
    for (const tp of traineeProfiles) {
      if (tp.person.userAccounts.length === 0) {
        // No login account exists, so there is nothing to assign. The
        // TraineeProfile keeps its own organizationId and stays reachable.
        unassignableTraineeProfiles.push(tp.id);
        continue;
      }
      for (const ua of tp.person.userAccounts) {
        await createIfNew({
          userAccountId: ua.id,
          organizationId: tp.organizationId,
          roleId: roleFor(ua.id, tp.organizationId),
          isActive: tp.deletedAt === null,
          startDate: tp.createdAt,
          sourceType: 'trainee_profile',
          sourceId: tp.id,
        });
      }
    }

    // ── Primary resolution ──
    // Replays auth.service.login's own rule so each user's active organization
    // is byte-for-byte what it resolves to today.
    const accounts = await this.prisma.userAccount.findMany({
      include: { organizations: { where: { isActive: true } } },
    });
    let primariesSet = 0;
    for (const acc of accounts) {
      const legacyPrimary =
        acc.organizations.find((uo) => uo.isPrimary) ?? acc.organizations[0] ?? null;

      const assignments = await this.prisma.organizationAssignment.findMany({
        where: { userAccountId: acc.id, isActive: true },
        orderBy: { startDate: 'asc' },
      });
      if (assignments.length === 0) continue;

      const target =
        (legacyPrimary && assignments.find((a) => a.organizationId === legacyPrimary.organizationId)) ??
        assignments[0];

      await this.prisma.organizationAssignment.updateMany({
        where: { userAccountId: acc.id, isPrimary: true, id: { not: target.id } },
        data: { isPrimary: false },
      });
      if (!target.isPrimary) {
        await this.prisma.organizationAssignment.update({
          where: { id: target.id },
          data: { isPrimary: true },
        });
      }
      primariesSet++;
    }

    this.logger.log(
      `Backfill complete: ${created} created, ${skipped} skipped, ${primariesSet} primaries set, ` +
        `${unassignableTraineeProfiles.length} trainee profiles without a login account.`,
    );
    return { created, skipped, primariesSet, unassignableTraineeProfiles };
  }
}
