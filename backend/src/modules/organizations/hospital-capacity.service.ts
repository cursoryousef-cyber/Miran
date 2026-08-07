import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CapacityService } from './capacity.service';
import { IAuthenticatedUser } from '../../common/interfaces';
import {
  UpdateDepartmentCapacityDto,
  UpdateHospitalTotalCapacityDto,
  UpsertCapacityAllocationDto,
} from './dto/capacity-allocation.dto';

/**
 * Hospital-exclusive capacity management (Stage 4/7). Clusters get read-only
 * access via getBreakdown(); only the owning hospital (or platform_owner) can
 * write. Every write re-validates against current occupancy first — a
 * hospital cannot silently shrink capacity below what's already allocated,
 * per the user's "recalculation safeguard" requirement.
 */
@Injectable()
export class HospitalCapacityService {
  constructor(
    private prisma: PrismaService,
    private capacityService: CapacityService,
  ) {}

  private assertHospitalScope(user: IAuthenticatedUser, hospitalId: string) {
    if (user.roles.includes('platform_owner') || user.roles.includes('system_admin')) return;
    if (user.organizationId !== hospitalId) {
      throw new ForbiddenException('لا يمكنك تعديل الطاقة الاستيعابية لمستشفى غير مستشفاك');
    }
  }

  private async requireHospital(hospitalId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id: hospitalId, deletedAt: null },
      include: { organizationType: true },
    });
    if (!org) throw new NotFoundException('المستشفى غير موجود');
    return org;
  }

  // ─── القراءة (التجمع والمستشفى معاً) ──────────────────────────────────────
  async getBreakdown(hospitalId: string) {
    await this.requireHospital(hospitalId);

    const [hospital, departments, allocations] = await Promise.all([
      this.capacityService.getHospitalOccupancy(hospitalId),
      this.prisma.department.findMany({
        where: { organizationId: hospitalId, isActive: true },
        select: {
          id: true, nameAr: true, nameEn: true, capacity: true,
          maxTrainers: true, maxSupervisors: true, maxActiveInterns: true,
        },
      }),
      this.prisma.capacityAllocation.findMany({
        where: { organizationId: hospitalId },
        orderBy: [{ scopeType: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const departmentBreakdown = await Promise.all(
      departments.map(async (d) => ({
        ...d,
        occupancy: await this.capacityService.getDepartmentOccupancy(d.id),
      })),
    );

    const specialtyAllocations = allocations.filter((a) => a.scopeType === 'specialty');
    const specialtyBreakdown = await Promise.all(
      specialtyAllocations.map(async (a) => ({
        allocation: a,
        occupancy: await this.capacityService.getSpecialtyOccupancy(hospitalId, {
          specialtyCode: a.specialtyCode,
          gender: a.gender,
          trainingPeriod: a.trainingPeriod,
        }),
      })),
    );

    const trainerAllocations = allocations.filter((a) => a.scopeType === 'trainer');
    const supervisorAllocations = allocations.filter((a) => a.scopeType === 'supervisor');
    const supervisorBreakdown = await Promise.all(
      supervisorAllocations.map(async (a) => ({
        allocation: a,
        occupancy: await this.capacityService.getSupervisorOccupancy(a.scopeId),
      })),
    );

    return {
      hospital: hospital,
      departments: departmentBreakdown,
      specialties: specialtyBreakdown,
      trainerRules: trainerAllocations,
      supervisors: supervisorBreakdown,
    };
  }

  // ─── الكتابة (المستشفى فقط) ────────────────────────────────────────────────
  async updateHospitalTotalCapacity(hospitalId: string, dto: UpdateHospitalTotalCapacityDto, user: IAuthenticatedUser) {
    this.assertHospitalScope(user, hospitalId);
    await this.requireHospital(hospitalId);

    const current = await this.capacityService.getHospitalOccupancy(hospitalId);
    if (dto.capacity < current.occupied) {
      throw new BadRequestException(
        `لا يمكن تخفيض الطاقة الكلية إلى ${dto.capacity} — يوجد حالياً ${current.occupied} متدرب مُسجّل فعلياً في المستشفى`,
      );
    }

    const updated = await this.prisma.organization.update({
      where: { id: hospitalId },
      data: { capacity: dto.capacity, updatedById: user.accountId },
    });

    await this.audit(user, hospitalId, 'update_hospital_total_capacity', hospitalId, { capacity: current.capacity }, { capacity: dto.capacity });

    return { data: updated, success: true, message: 'تم تحديث الطاقة الاستيعابية الكلية للمستشفى' };
  }

  async updateDepartmentCapacity(departmentId: string, dto: UpdateDepartmentCapacityDto, user: IAuthenticatedUser) {
    const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new NotFoundException('القسم غير موجود');
    this.assertHospitalScope(user, dept.organizationId);

    if (dto.capacity !== undefined) {
      const current = await this.capacityService.getDepartmentOccupancy(departmentId);
      if (dto.capacity < current.occupied) {
        throw new BadRequestException(
          `لا يمكن تخفيض سعة القسم إلى ${dto.capacity} — يوجد حالياً ${current.occupied} روتيشن نشط في هذا القسم`,
        );
      }
    }

    const updated = await this.prisma.department.update({
      where: { id: departmentId },
      data: {
        capacity: dto.capacity ?? dept.capacity,
        maxTrainers: dto.maxTrainers ?? dept.maxTrainers,
        maxSupervisors: dto.maxSupervisors ?? dept.maxSupervisors,
        maxActiveInterns: dto.maxActiveInterns ?? dept.maxActiveInterns,
        updatedById: user.accountId,
      },
    });

    await this.audit(user, dept.organizationId, 'update_department_capacity', departmentId,
      { capacity: dept.capacity, maxTrainers: dept.maxTrainers, maxSupervisors: dept.maxSupervisors, maxActiveInterns: dept.maxActiveInterns },
      dto,
    );

    return { data: updated, success: true, message: 'تم تحديث طاقة القسم' };
  }

  async upsertAllocation(hospitalId: string, dto: UpsertCapacityAllocationDto, user: IAuthenticatedUser) {
    this.assertHospitalScope(user, hospitalId);
    await this.requireHospital(hospitalId);

    const scopeId = dto.scopeId || '';
    const programId = dto.programId || '';
    const specialtyCode = dto.specialtyCode || '';
    const gender = dto.gender || '';
    const trainingPeriod = dto.trainingPeriod || '';

    // A program allocation without a program would be indistinguishable from the
    // hospital's overall capacity row.
    if (dto.scopeType === 'program' && !programId) {
      throw new BadRequestException('يجب تحديد البرنامج التدريبي عند ضبط سعة برنامج');
    }
    if (programId) {
      const program = await this.prisma.program.findFirst({
        where: { id: programId, deletedAt: null },
        select: { id: true },
      });
      if (!program) throw new NotFoundException('البرنامج التدريبي غير موجود في الكتالوج');
    }

    // منع تخفيض السعة تحت الإشغال الحالي لنفس نطاق القيد بالضبط
    if (dto.scopeType === 'specialty') {
      const occ = await this.capacityService.getSpecialtyOccupancy(hospitalId, { specialtyCode, gender, trainingPeriod });
      if (occ.occupied > dto.totalCapacity) {
        throw new BadRequestException(
          `لا يمكن ضبط السعة على ${dto.totalCapacity} — يوجد حالياً ${occ.occupied} متدرب ضمن هذا التصنيف`,
        );
      }
    } else if (dto.scopeType === 'supervisor' && scopeId) {
      const occ = await this.capacityService.getSupervisorOccupancy(scopeId);
      if (occ.occupied > dto.totalCapacity) {
        throw new BadRequestException(
          `لا يمكن ضبط سعة المشرف على ${dto.totalCapacity} — لديه حالياً ${occ.occupied} روتيشن نشط`,
        );
      }
    } else if (programId) {
      // Program seats, and any department/trainer slice of them, may not be set
      // below what is already occupied — that would strand placed trainees.
      const occ =
        dto.scopeType === 'department' && scopeId
          ? await this.capacityService.getDepartmentProgramOccupancy(hospitalId, scopeId, programId)
          : dto.scopeType === 'trainer' && scopeId
            ? await this.capacityService.getTrainerProgramOccupancy(hospitalId, scopeId, programId)
            : await this.capacityService.getProgramOccupancy(hospitalId, programId);
      if (occ.occupied > dto.totalCapacity) {
        throw new BadRequestException(
          `لا يمكن ضبط السعة على ${dto.totalCapacity} — يوجد حالياً ${occ.occupied} متدرب ضمن هذا البرنامج`,
        );
      }
    }

    const allocation = await this.prisma.capacityAllocation.upsert({
      where: {
        organizationId_scopeType_scopeId_programId_specialtyCode_gender_trainingPeriod: {
          organizationId: hospitalId,
          scopeType: dto.scopeType,
          scopeId,
          programId,
          specialtyCode,
          gender,
          trainingPeriod,
        },
      },
      create: {
        organizationId: hospitalId,
        scopeType: dto.scopeType,
        scopeId,
        programId,
        specialtyCode,
        gender,
        trainingPeriod,
        totalCapacity: dto.totalCapacity,
        notes: dto.notes,
        createdById: user.accountId,
      },
      update: {
        totalCapacity: dto.totalCapacity,
        notes: dto.notes,
        updatedById: user.accountId,
      },
    });

    await this.audit(user, hospitalId, 'upsert_capacity_allocation', allocation.id, null, dto);

    return { data: allocation, success: true, message: 'تم حفظ قاعدة الطاقة الاستيعابية' };
  }

  async deleteAllocation(hospitalId: string, allocationId: string, user: IAuthenticatedUser) {
    this.assertHospitalScope(user, hospitalId);
    const allocation = await this.prisma.capacityAllocation.findUnique({ where: { id: allocationId } });
    if (!allocation || allocation.organizationId !== hospitalId) {
      throw new NotFoundException('قاعدة الطاقة الاستيعابية غير موجودة');
    }

    await this.prisma.capacityAllocation.delete({ where: { id: allocationId } });
    await this.audit(user, hospitalId, 'delete_capacity_allocation', allocationId, allocation, null);

    return { success: true, message: 'تم حذف قاعدة الطاقة الاستيعابية' };
  }

  private async audit(user: IAuthenticatedUser, organizationId: string, action: string, entityId: string, oldValues: object | null, newValues: object | null) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId: user.accountId,
        action,
        entityType: 'CapacityAllocation',
        entityId,
        oldValues: oldValues as any,
        newValues: newValues as any,
      },
    });
  }
}
