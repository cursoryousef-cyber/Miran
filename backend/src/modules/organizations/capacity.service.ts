import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type CapacityScopeType =
  | 'hospital'
  | 'department'
  | 'specialty'
  | 'trainer'
  | 'supervisor'
  | 'program';

export interface CapacityScope {
  type: CapacityScopeType;
  organizationId: string; // hospital org id (the anchor for department/specialty/trainer/supervisor scopes too)
  scopeId?: string; // departmentId | trainerProfileId | supervisorAccountId
  programId?: string;
  specialtyCode?: string;
  gender?: string;
  trainingPeriod?: string;
}

/**
 * Staging rows already committed to a hospital still consume a seat even though
 * the trainee profile does not exist yet. Counting only trainee profiles would
 * let a single allocation batch overfill a program.
 */
const OCCUPYING_ROW_STATUSES = ['allocated', 'hospital_review', 'on_hold', 'active'];

export interface OccupancyResult {
  capacity: number;
  occupied: number;
  available: number;
  occupancyPercentage: number;
}

const DEFAULT_HOSPITAL_CAPACITY_FALLBACK = 50;

/**
 * Single source of truth for capacity/occupancy math. Replaces three
 * previously-independent implementations in
 * OrganizationsService.getHospitalCardsMetrics, TrainingRequestsService.autoAllocate,
 * and TrainingRequestsService.validateCapacity.
 *
 * Mirrors the DB-level triggers in the Phase 2 migration
 * (enforce_trainee_capacity / enforce_rotation_capacity) — this service is
 * the application-layer check used to give early, friendly errors; the
 * triggers are the last line of defense regardless of code path.
 */
@Injectable()
export class CapacityService {
  constructor(private prisma: PrismaService) {}

  async getOccupancy(scope: CapacityScope): Promise<OccupancyResult> {
    switch (scope.type) {
      case 'hospital':
        return this.getHospitalOccupancy(scope.organizationId);
      case 'department':
        return this.getDepartmentOccupancy(scope.scopeId!);
      case 'trainer':
        return this.getTrainerOccupancy(scope.scopeId!);
      case 'specialty':
        return this.getSpecialtyOccupancy(scope.organizationId, {
          specialtyCode: scope.specialtyCode,
          gender: scope.gender,
          trainingPeriod: scope.trainingPeriod,
        });
      case 'supervisor':
        return this.getSupervisorOccupancy(scope.scopeId!);
      case 'program':
        return this.getProgramOccupancy(scope.organizationId, scope.programId!);
      default:
        return { capacity: 0, occupied: 0, available: 0, occupancyPercentage: 0 };
    }
  }

  // ─── Program-scoped capacity (Phase 2 / Module 2) ────────────────────────────

  /**
   * Seats a hospital has declared for a training program, and how many are taken.
   *
   * A capacity of 0 means the hospital has not declared this program. Callers must
   * distinguish that from "declared but full" — see `declaresAnyProgram`.
   */
  async getProgramOccupancy(organizationId: string, programId: string): Promise<OccupancyResult> {
    const allocation = await this.findAllocation(organizationId, 'program', '', programId);
    const occupied = await this.countProgramOccupancy({ organizationId, programId });
    return this.toExplicitResult(allocation?.totalCapacity ?? 0, occupied);
  }

  /** Seats of a program allotted to one department, and how many are taken. */
  async getDepartmentProgramOccupancy(
    organizationId: string,
    departmentId: string,
    programId: string,
  ): Promise<OccupancyResult> {
    const allocation = await this.findAllocation(organizationId, 'department', departmentId, programId);
    const occupied = await this.countProgramOccupancy({ organizationId, programId, departmentId });
    return this.toExplicitResult(allocation?.totalCapacity ?? 0, occupied);
  }

  /** Seats of a program allotted to one trainer, and how many are taken. */
  async getTrainerProgramOccupancy(
    organizationId: string,
    trainerProfileId: string,
    programId: string,
  ): Promise<OccupancyResult> {
    const allocation = await this.findAllocation(organizationId, 'trainer', trainerProfileId, programId);
    const occupied = await this.countProgramOccupancy({ organizationId, programId, trainerProfileId });
    return this.toExplicitResult(allocation?.totalCapacity ?? 0, occupied);
  }

  /**
   * Whether a hospital has opted into program-based capacity at all.
   *
   * Hospitals that have declared none keep the pre-Module-2 behaviour, so
   * introducing program capacity does not silently block every allocation into
   * hospitals that have not configured it yet.
   */
  async declaresAnyProgram(organizationId: string): Promise<boolean> {
    const count = await this.prisma.capacityAllocation.count({
      where: { organizationId, scopeType: 'program', programId: { not: '' } },
    });
    return count > 0;
  }

  /** Every program a hospital has declared seats for. */
  async listDeclaredPrograms(organizationId: string) {
    return this.prisma.capacityAllocation.findMany({
      where: { organizationId, scopeType: 'program', programId: { not: '' } },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async findAllocation(
    organizationId: string,
    scopeType: string,
    scopeId: string,
    programId: string,
  ) {
    return this.prisma.capacityAllocation.findFirst({
      where: { organizationId, scopeType, scopeId, programId },
    });
  }

  /**
   * Occupied seats for a program: promoted trainee profiles plus staging rows
   * already committed to this hospital (and optionally department/trainer).
   *
   * A staging row's program comes from its training request, which is where the
   * university selects it.
   */
  private async countProgramOccupancy(filter: {
    organizationId: string;
    programId: string;
    departmentId?: string;
    trainerProfileId?: string;
  }): Promise<number> {
    const [profiles, rows] = await Promise.all([
      filter.departmentId || filter.trainerProfileId
        ? this.prisma.rotation.count({
            where: {
              organizationId: filter.organizationId,
              programId: filter.programId,
              status: 'active',
              ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
              ...(filter.trainerProfileId ? { trainerProfileId: filter.trainerProfileId } : {}),
            },
          })
        : this.prisma.traineeProfile.count({
            where: {
              organizationId: filter.organizationId,
              programId: filter.programId,
              deletedAt: null,
            },
          }),
      this.prisma.trainingRequestTrainee.count({
        where: {
          assignedHospitalId: filter.organizationId,
          status: { in: OCCUPYING_ROW_STATUSES },
          trainingRequest: { programId: filter.programId },
          ...(filter.departmentId ? { assignedDepartmentId: filter.departmentId } : {}),
          ...(filter.trainerProfileId ? { assignedTrainerProfileId: filter.trainerProfileId } : {}),
        },
      }),
    ]);
    return profiles + rows;
  }

  /**
   * Unlike `toResult`, this never substitutes a fallback capacity: a program with
   * no declared seats must read as zero, not as a default allowance.
   */
  private toExplicitResult(capacity: number, occupied: number): OccupancyResult {
    const available = Math.max(0, capacity - occupied);
    const occupancyPercentage =
      capacity > 0 ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0;
    return { capacity, occupied, available, occupancyPercentage };
  }

  private toResult(capacity: number, occupied: number): OccupancyResult {
    const safeCapacity = capacity > 0 ? capacity : DEFAULT_HOSPITAL_CAPACITY_FALLBACK;
    const available = Math.max(0, safeCapacity - occupied);
    const occupancyPercentage = Math.min(100, Math.round((occupied / safeCapacity) * 100));
    return { capacity: safeCapacity, occupied, available, occupancyPercentage };
  }

  async getHospitalOccupancy(organizationId: string): Promise<OccupancyResult> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        capacity: true,
        _count: { select: { traineeProfiles: true } },
      },
    });
    if (!org) return { capacity: 0, occupied: 0, available: 0, occupancyPercentage: 0 };
    return this.toResult(org.capacity, org._count.traineeProfiles);
  }

  async getDepartmentOccupancy(departmentId: string): Promise<OccupancyResult> {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { capacity: true },
    });
    if (!dept) return { capacity: 0, occupied: 0, available: 0, occupancyPercentage: 0 };

    const occupied = await this.prisma.rotation.count({
      where: { departmentId, status: 'active' },
    });
    return this.toResult(dept.capacity, occupied);
  }

  async getTrainerOccupancy(trainerProfileId: string): Promise<OccupancyResult> {
    const trainer = await this.prisma.trainerProfile.findUnique({
      where: { id: trainerProfileId },
      select: { maxTrainees: true },
    });
    if (!trainer) return { capacity: 0, occupied: 0, available: 0, occupancyPercentage: 0 };

    const occupied = await this.prisma.rotation.count({
      where: { trainerProfileId, status: 'active' },
    });
    return this.toResult(trainer.maxTrainees, occupied);
  }

  /**
   * Specialty (optionally further scoped by gender / training period)
   * capacity, sourced from CapacityAllocation. '' sentinel means unrestricted
   * on that dimension — mirrors the SQL trigger's matching logic exactly.
   */
  async getSpecialtyOccupancy(
    organizationId: string,
    filter: { specialtyCode?: string; gender?: string; trainingPeriod?: string },
  ): Promise<OccupancyResult> {
    const specialtyCode = filter.specialtyCode || '';
    const gender = filter.gender || '';
    const trainingPeriod = filter.trainingPeriod || '';

    // Specialty allocations are not program-scoped, so they carry the '' sentinel
    // in program_id (the uniqueness key gained that column in Module 2).
    const allocation = await this.prisma.capacityAllocation.findFirst({
      where: {
        organizationId,
        scopeType: 'specialty',
        scopeId: '',
        programId: '',
        specialtyCode,
        gender,
        trainingPeriod,
      },
    });
    if (!allocation) return { capacity: 0, occupied: 0, available: 0, occupancyPercentage: 0 };

    const rows = await this.prisma.traineeProfile.findMany({
      where: { organizationId, deletedAt: null },
      select: { specialtyEn: true, specialtyAr: true, person: { select: { gender: true } }, academicIntake: { select: { academicYear: true } } },
    });
    const occupied = rows.filter((r) => {
      const spec = r.specialtyEn || r.specialtyAr || '';
      return (
        (specialtyCode === '' || spec === specialtyCode) &&
        (gender === '' || (r.person?.gender || '') === gender) &&
        (trainingPeriod === '' || (r.academicIntake?.academicYear || '') === trainingPeriod)
      );
    }).length;

    const safeCapacity = allocation.totalCapacity;
    const available = Math.max(0, safeCapacity - occupied);
    const occupancyPercentage = safeCapacity > 0 ? Math.min(100, Math.round((occupied / safeCapacity) * 100)) : 0;
    return { capacity: safeCapacity, occupied, available, occupancyPercentage };
  }

  async getSupervisorOccupancy(supervisorAccountId: string): Promise<OccupancyResult> {
    const allocation = await this.prisma.capacityAllocation.findFirst({
      where: { scopeType: 'supervisor', scopeId: supervisorAccountId },
      orderBy: { createdAt: 'desc' },
    });
    if (!allocation) return { capacity: 0, occupied: 0, available: 0, occupancyPercentage: 0 };

    const occupied = await this.prisma.rotation.count({
      where: { supervisorAccountId, status: 'active' },
    });
    const safeCapacity = allocation.totalCapacity;
    const available = Math.max(0, safeCapacity - occupied);
    const occupancyPercentage = safeCapacity > 0 ? Math.min(100, Math.round((occupied / safeCapacity) * 100)) : 0;
    return { capacity: safeCapacity, occupied, available, occupancyPercentage };
  }

  /**
   * Translates the DB trigger's raised exception (prefixed CAPACITY_EXCEEDED:)
   * into a clean BadRequestException. Call sites that write to trainee_profiles
   * or rotations should wrap the write with this so callers get a proper 400
   * instead of a raw Postgres/Prisma error leaking through.
   */
  async runGuarded<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (e) {
      const message = (e as Error)?.message || '';
      // Postgres's debug-formatted error struct puts the whole thing on one
      // "line" with no real newline, so bound the capture at the closing
      // quote of the message field (our text never contains a literal ").
      const match = message.match(/CAPACITY_EXCEEDED:\s*([^"\n]+)/);
      if (match) {
        throw new BadRequestException(match[1].trim());
      }
      throw e;
    }
  }
}
