import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CapacityService } from '../organizations/capacity.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AllocationWeights {
  capacityRatio: number;     // remaining capacity %  → default 30
  specialtyMatch: number;    // explicit specialty allocation exists → default 20
  departmentLoad: number;    // dept load ratio → default 20
  trainerLoad: number;       // trainer load ratio → default 15
  affiliation: number;       // OrganizationAffiliation(uni→hospital) → default 10
  geoMatch: number;          // same city/region as university → default 5
}

const DEFAULT_WEIGHTS: AllocationWeights = {
  capacityRatio: 30,
  specialtyMatch: 20,
  departmentLoad: 20,
  trainerLoad: 15,
  affiliation: 10,
  geoMatch: 5,
};

interface TraineeRow {
  id: string;
  specialty: string | null;
  gender: string | null;
  trainingPeriod: string | null;
  universityOrgId: string | null;
  status: string;
}

interface HospitalCandidate {
  id: string;
  nameAr: string;
  status: string;
  cityAr: string | null;
  regionAr: string | null;
  capacity: number;
  departments: Array<{
    id: string;
    nameAr: string;
    capacity: number;
    isActive: boolean;
    trainerProfiles: Array<{ id: string; maxTrainees: number }>;
  }>;
}

export interface HospitalEvaluation {
  hospitalId: string;
  hospitalName: string;
  passed: boolean;
  failureReason?: string;
  score?: number;
  candidateDepartmentId?: string;
  candidateDepartmentName?: string;
  candidateTrainerProfileId?: string;
  breakdown?: Record<string, number>;
}

export interface RowAllocationResult {
  rowId: string;
  allocated: boolean;
  hospitalId?: string;
  hospitalName?: string;
  departmentId?: string;
  trainerId?: string;
  score?: number;
  evaluations: HospitalEvaluation[];
  reason: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AllocationEngineService {
  constructor(
    private prisma: PrismaService,
    private capacityService: CapacityService,
  ) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Allocates all cluster_approved rows of a training request.
   * Returns a per-row allocation result with full audit trail.
   */
  async allocateRequest(
    trainingRequestId: string,
    clusterId: string,
    actorId?: string,
  ): Promise<RowAllocationResult[]> {
    const [rows, hospitals, weights] = await Promise.all([
      this.fetchApprovedRows(trainingRequestId),
      this.fetchHospitalCandidates(clusterId),
      this.loadWeights(clusterId),
    ]);

    if (hospitals.length === 0) {
      return rows.map((r) => ({
        rowId: r.id,
        allocated: false,
        evaluations: [],
        reason: 'لا توجد مستشفيات مفعّلة تابعة للتجمع الصحي',
      }));
    }

    const results: RowAllocationResult[] = [];
    for (const row of rows) {
      const result = await this.allocateSingleRow(row, hospitals, weights, clusterId);
      if (result.allocated) {
        await this.commitAllocation(row, result, actorId);
        // Optimistically decrement in-memory so the next row sees updated loads
        this.applySyntheticOccupancy(hospitals, result);
      } else {
        await this.writeFailureAudit(row, result, trainingRequestId, clusterId, actorId);
      }
      results.push(result);
    }
    return results;
  }

  /**
   * Re-allocates a single row (manual override or auto-reallocation).
   * `preferHospitalId` skips the scoring step and forces that hospital through the guard chain.
   */
  async reallocateRow(
    rowId: string,
    actorId?: string,
    preferHospitalId?: string,
  ): Promise<RowAllocationResult> {
    const row = await this.prisma.trainingRequestTrainee.findUnique({
      where: { id: rowId },
      include: { trainingRequest: { select: { targetOrgId: true } } },
    });
    if (!row) throw new Error('الصف غير موجود');

    const clusterId = row.trainingRequest.targetOrgId;
    const hospitals = await this.fetchHospitalCandidates(clusterId, preferHospitalId);
    const weights = await this.loadWeights(clusterId);

    const traineeRow: TraineeRow = {
      id: row.id,
      specialty: row.specialty,
      gender: row.gender,
      trainingPeriod: row.trainingPeriod,
      universityOrgId: row.universityOrgId,
      status: row.status,
    };

    const result = await this.allocateSingleRow(traineeRow, hospitals, weights, clusterId);
    if (result.allocated) {
      await this.commitAllocation(traineeRow, result, actorId, true);
    } else {
      await this.writeFailureAudit(
        traineeRow,
        result,
        row.trainingRequestId,
        clusterId,
        actorId,
      );
    }
    return result;
  }

  // ─── Core logic ─────────────────────────────────────────────────────────────

  private async allocateSingleRow(
    row: TraineeRow,
    hospitals: HospitalCandidate[],
    weights: AllocationWeights,
    clusterId: string,
  ): Promise<RowAllocationResult> {
    const evaluations: HospitalEvaluation[] = [];

    for (const hosp of hospitals) {
      const eval_ = await this.evaluateHospital(row, hosp, clusterId);
      evaluations.push(eval_);
    }

    const passing = evaluations.filter((e) => e.passed);
    if (passing.length === 0) {
      return {
        rowId: row.id,
        allocated: false,
        evaluations,
        reason: 'لم يجتز أي مستشفى سلسلة التحقق من الطاقة الاستيعابية',
      };
    }

    const best = passing.reduce((a, b) => (b.score! > a.score! ? b : a));
    return {
      rowId: row.id,
      allocated: true,
      hospitalId: best.hospitalId,
      hospitalName: best.hospitalName,
      departmentId: best.candidateDepartmentId,
      trainerId: best.candidateTrainerProfileId,
      score: best.score,
      evaluations,
      reason: `أعلى تقييم (${best.score?.toFixed(1)}) — ${best.hospitalName}`,
    };
  }

  private async evaluateHospital(
    row: TraineeRow,
    hosp: HospitalCandidate,
    clusterId: string,
  ): Promise<HospitalEvaluation> {
    const fail = (reason: string): HospitalEvaluation => ({
      hospitalId: hosp.id,
      hospitalName: hosp.nameAr,
      passed: false,
      failureReason: reason,
    });

    // Guard 1: hospital active
    if (hosp.status !== 'active') {
      return fail('المستشفى غير مفعّل أو موقوف');
    }

    // Guard 2: hospital total capacity
    const hospOcc = await this.capacityService.getHospitalOccupancy(hosp.id);
    if (hospOcc.available <= 0) {
      return fail(`الطاقة الاستيعابية الإجمالية ممتلئة (${hospOcc.occupied}/${hospOcc.capacity})`);
    }

    // Guard 3: specialty allocation (if one exists, must have space)
    if (row.specialty) {
      const specOcc = await this.capacityService.getSpecialtyOccupancy(hosp.id, {
        specialtyCode: row.specialty,
        gender: row.gender || '',
        trainingPeriod: row.trainingPeriod || '',
      });
      if (specOcc.capacity > 0 && specOcc.available <= 0) {
        return fail(
          `تخصيص التخصص "${row.specialty}" ممتلئ (${specOcc.occupied}/${specOcc.capacity})`,
        );
      }
    }

    // Guard 4: gender policy — if a gender-specific allocation exists and it's full, block
    if (row.gender) {
      const genderOcc = await this.capacityService.getSpecialtyOccupancy(hosp.id, {
        specialtyCode: row.specialty || '',
        gender: row.gender,
        trainingPeriod: '',
      });
      if (genderOcc.capacity > 0 && genderOcc.available <= 0) {
        return fail(`مقاعد الجنس (${row.gender}) ممتلئة (${genderOcc.occupied}/${genderOcc.capacity})`);
      }
    }

    // Guard 5: department availability — find any active dept with open capacity
    const activeDepts = hosp.departments.filter((d) => d.isActive && d.capacity > 0);
    if (activeDepts.length === 0) {
      return fail('لا توجد أقسام سريرية مفعّلة بطاقة محددة');
    }

    let candidateDept: (typeof activeDepts)[0] | undefined;
    let candidateTrainer: { id: string; maxTrainees: number } | undefined;

    for (const dept of activeDepts) {
      const deptOcc = await this.capacityService.getDepartmentOccupancy(dept.id);
      if (deptOcc.available <= 0) continue;

      // Guard 6: trainer availability within this dept
      const availableTrainer = await this.findAvailableTrainer(dept.trainerProfiles);
      if (!availableTrainer) continue;

      candidateDept = dept;
      candidateTrainer = availableTrainer;
      break;
    }

    if (!candidateDept) {
      return fail('جميع الأقسام والمدربين ممتلئون');
    }

    // All guards passed — compute score
    const breakdown: Record<string, number> = {};
    const weights = DEFAULT_WEIGHTS; // caller will pass actual weights — simplified for now

    const hospScore = Math.round((hospOcc.available / Math.max(hospOcc.capacity, 1)) * weights.capacityRatio);
    breakdown.capacityRatio = hospScore;

    const deptOcc2 = await this.capacityService.getDepartmentOccupancy(candidateDept.id);
    const deptScore = Math.round((1 - deptOcc2.occupied / Math.max(deptOcc2.capacity, 1)) * weights.departmentLoad);
    breakdown.departmentLoad = deptScore;

    const trainerOcc = await this.capacityService.getTrainerOccupancy(candidateTrainer!.id);
    const trainerScore = Math.round(
      (1 - trainerOcc.occupied / Math.max(trainerOcc.capacity, 1)) * weights.trainerLoad,
    );
    breakdown.trainerLoad = trainerScore;

    let specScore = 0;
    if (row.specialty) {
      const hasExplicitAlloc = await this.prisma.capacityAllocation.count({
        where: {
          organizationId: hosp.id,
          scopeType: 'specialty',
          specialtyCode: row.specialty,
        },
      });
      specScore = hasExplicitAlloc > 0 ? weights.specialtyMatch : 0;
    }
    breakdown.specialtyMatch = specScore;

    let affiliationScore = 0;
    if (row.universityOrgId) {
      const hasAffil = await this.prisma.organizationAffiliation.count({
        where: {
          sourceOrgId: row.universityOrgId,
          targetOrgId: hosp.id,
          status: 'active',
        },
      });
      affiliationScore = hasAffil > 0 ? weights.affiliation : 0;
    }
    breakdown.affiliation = affiliationScore;

    const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

    return {
      hospitalId: hosp.id,
      hospitalName: hosp.nameAr,
      passed: true,
      score: totalScore,
      candidateDepartmentId: candidateDept.id,
      candidateDepartmentName: candidateDept.nameAr,
      candidateTrainerProfileId: candidateTrainer?.id,
      breakdown,
    };
  }

  private async findAvailableTrainer(
    trainers: Array<{ id: string; maxTrainees: number }>,
  ): Promise<{ id: string; maxTrainees: number } | undefined> {
    for (const t of trainers) {
      const occ = await this.capacityService.getTrainerOccupancy(t.id);
      if (occ.available > 0) return t;
    }
    return undefined;
  }

  // ─── Commit & Audit ─────────────────────────────────────────────────────────

  private async commitAllocation(
    row: TraineeRow,
    result: RowAllocationResult,
    actorId?: string,
    isReallocation = false,
  ) {
    const prevRow = await this.prisma.trainingRequestTrainee.findUnique({
      where: { id: row.id },
      select: {
        status: true,
        assignedHospitalId: true,
        assignedDepartmentId: true,
        assignedTrainerProfileId: true,
        trainingRequestId: true,
        trainingRequest: { select: { targetOrgId: true } },
      },
    });

    await this.prisma.trainingRequestTrainee.update({
      where: { id: row.id },
      data: {
        status: 'allocated',
        assignedHospitalId: result.hospitalId,
        assignedDepartmentId: result.departmentId,
        assignedTrainerProfileId: result.trainerId,
        updatedById: actorId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: prevRow?.trainingRequest.targetOrgId,
        actorId,
        action: isReallocation ? 'reallocate_trainee_row' : 'allocate_trainee_row',
        entityType: 'TrainingRequestTrainee',
        entityId: row.id,
        oldValues: {
          status: prevRow?.status,
          assignedHospitalId: prevRow?.assignedHospitalId,
          assignedDepartmentId: prevRow?.assignedDepartmentId,
          assignedTrainerProfileId: prevRow?.assignedTrainerProfileId,
        },
        newValues: {
          status: 'allocated',
          assignedHospitalId: result.hospitalId,
          assignedDepartmentId: result.departmentId,
          assignedTrainerProfileId: result.trainerId,
          score: result.score,
          allocationAudit: {
            evaluatedHospitals: result.evaluations.map((e) => ({
              hospitalId: e.hospitalId,
              hospitalName: e.hospitalName,
              passed: e.passed,
              failureReason: e.failureReason,
              score: e.score,
              breakdown: e.breakdown,
            })),
            decision: { hospitalId: result.hospitalId, score: result.score, reason: result.reason },
          },
        },
      },
    });
  }

  private async writeFailureAudit(
    row: TraineeRow,
    result: RowAllocationResult,
    trainingRequestId: string,
    clusterId: string,
    actorId?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId: clusterId,
        actorId,
        action: 'allocation_failed_trainee_row',
        entityType: 'TrainingRequestTrainee',
        entityId: row.id,
        newValues: {
          reason: result.reason,
          evaluatedHospitals: result.evaluations.map((e) => ({
            hospitalId: e.hospitalId,
            hospitalName: e.hospitalName,
            passed: e.passed,
            failureReason: e.failureReason,
          })),
        },
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async fetchApprovedRows(trainingRequestId: string): Promise<TraineeRow[]> {
    const rows = await this.prisma.trainingRequestTrainee.findMany({
      where: { trainingRequestId, status: 'cluster_approved' },
      select: {
        id: true,
        specialty: true,
        gender: true,
        trainingPeriod: true,
        universityOrgId: true,
        status: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    return rows;
  }

  private async fetchHospitalCandidates(
    clusterId: string,
    onlyHospitalId?: string,
  ): Promise<HospitalCandidate[]> {
    const where: Record<string, unknown> = {
      parentId: clusterId,
      deletedAt: null,
    };
    if (onlyHospitalId) where.id = onlyHospitalId;

    const hospitals = await this.prisma.organization.findMany({
      where,
      select: {
        id: true,
        nameAr: true,
        status: true,
        cityAr: true,
        regionAr: true,
        capacity: true,
        departments: {
          where: { isActive: true },
          select: {
            id: true,
            nameAr: true,
            capacity: true,
            isActive: true,
            trainerProfiles: {
              where: { isActive: true },
              select: { id: true, maxTrainees: true },
            },
          },
        },
      },
    });
    return hospitals as HospitalCandidate[];
  }

  private async loadWeights(clusterId: string): Promise<AllocationWeights> {
    const setting = await this.prisma.setting.findFirst({
      where: { organizationId: clusterId, key: 'smart_allocation_weights' },
    });
    if (setting?.value) {
      try {
        return { ...DEFAULT_WEIGHTS, ...(setting.value as object) } as AllocationWeights;
      } catch {
        return DEFAULT_WEIGHTS;
      }
    }
    return DEFAULT_WEIGHTS;
  }

  /**
   * After committing an allocation, decrement in-memory counters so the next
   * row in the same batch sees up-to-date loads without a DB round-trip.
   */
  private applySyntheticOccupancy(hospitals: HospitalCandidate[], result: RowAllocationResult) {
    const hosp = hospitals.find((h) => h.id === result.hospitalId);
    if (!hosp) return;
    hosp.capacity = Math.max(0, hosp.capacity - 1);
    if (result.departmentId) {
      const dept = hosp.departments.find((d) => d.id === result.departmentId);
      if (dept) dept.capacity = Math.max(0, dept.capacity - 1);
    }
  }
}
