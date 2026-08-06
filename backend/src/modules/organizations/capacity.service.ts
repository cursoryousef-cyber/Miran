import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type CapacityScopeType = 'hospital' | 'department' | 'specialty' | 'trainer' | 'supervisor';

export interface CapacityScope {
  type: CapacityScopeType;
  organizationId: string; // hospital org id (the anchor for department/specialty/trainer/supervisor scopes too)
  scopeId?: string; // departmentId | trainerProfileId | supervisorAccountId
  specialtyCode?: string;
}

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
 * 'specialty' and 'supervisor' scopes depend on the CapacityAllocation model
 * and Rotation.supervisorAccountId, both introduced by the Phase 2 migration —
 * until then they resolve via getSpecialtyOccupancy/getSupervisorOccupancy stubs.
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
      case 'supervisor':
        // Implemented in Phase 2 once CapacityAllocation/Rotation.supervisorAccountId exist.
        return { capacity: 0, occupied: 0, available: 0, occupancyPercentage: 0 };
      default:
        return { capacity: 0, occupied: 0, available: 0, occupancyPercentage: 0 };
    }
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

  // ─── Phase 2 will implement these against the new CapacityAllocation model
  // and Rotation.supervisorAccountId; getOccupancy() short-circuits to zero
  // for these scope types until then. ──────────────────────────────────────
}
