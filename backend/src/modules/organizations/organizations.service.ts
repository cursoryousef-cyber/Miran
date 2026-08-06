import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationHierarchyService } from './organization-hierarchy.service';
import { CapacityService } from './capacity.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { IAuthenticatedUser } from '../../common/interfaces';
import { OrganizationAssignmentService } from '../organization-assignments/organization-assignment.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private hierarchyService: OrganizationHierarchyService,
    private capacityService: CapacityService,
    private orgAssignments: OrganizationAssignmentService,
  ) {}

  async findAll(page = 1, limit = 20, search?: string, typeId?: string, parentId?: string) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deletedAt: null };

    if (typeId) where.organizationTypeId = typeId;
    if (parentId) where.parentId = parentId;

    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { cityAr: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organizationType: true,
          parent: { select: { id: true, nameAr: true, code: true } },
          license: true,
          _count: {
            select: {
              children: true,
              traineeProfiles: true,
              trainerProfiles: true,
              departments: true,
            },
          },
        },
      }),
    ]);

    // Member count now comes from OrganizationAssignment; the response keeps the
    // original _count.userOrganizations key so callers are unaffected.
    const memberCounts = await this.orgAssignments.countMembershipsByOrg(data.map((o) => o.id));
    const withCounts = data.map((o) => ({
      ...o,
      _count: { ...o._count, userOrganizations: memberCounts.get(o.id) ?? 0 },
    }));

    return {
      data: withCounts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: {
        organizationType: true,
        parent: true,
        children: {
          include: { organizationType: true },
        },
        license: true,
        featureFlags: true,
        orgSettings: true,
        affiliationsAsSource: { include: { targetOrg: true } },
        affiliationsAsTarget: { include: { sourceOrg: true } },
        _count: {
          select: {
            traineeProfiles: true,
            trainerProfiles: true,
            departments: true,
            programs: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('الجهة غير موجودة');
    }

    const memberCounts = await this.orgAssignments.countMembershipsByOrg([org.id]);
    return {
      ...org,
      _count: { ...org._count, userOrganizations: memberCounts.get(org.id) ?? 0 },
    };
  }

  async create(dto: CreateOrganizationDto, user?: IAuthenticatedUser) {
    const existing = await this.prisma.organization.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`رمز الجهة (${dto.code}) مستخدم مسبقاً`);
    }

    const org = await this.prisma.organization.create({
      data: {
        ...dto,
        code: dto.code.toUpperCase(),
        createdById: user?.accountId,
      },
      include: { organizationType: true },
    });

    // Add closure hierarchy entry
    await this.hierarchyService.addNode(org.id, dto.parentId);

    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto, user?: IAuthenticatedUser) {
    await this.findOne(id);

    return this.prisma.organization.update({
      where: { id },
      data: {
        ...dto,
        updatedById: user?.accountId,
      },
      include: { organizationType: true },
    });
  }

  async softDelete(id: string, user?: IAuthenticatedUser) {
    await this.findOne(id);

    return this.prisma.organization.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: user?.accountId,
      },
    });
  }

  async getTree() {
    // Get top-level organizations (parentId === null)
    const roots = await this.prisma.organization.findMany({
      where: { parentId: null, deletedAt: null },
      include: {
        organizationType: true,
        children: {
          where: { deletedAt: null },
          include: {
            organizationType: true,
            children: {
              where: { deletedAt: null },
              include: { organizationType: true },
            },
          },
        },
      },
    });

    return roots;
  }

  async getTypes() {
    return this.prisma.organizationType.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getHospitalCardsMetrics(clusterId?: string) {
    const where: any = { deletedAt: null };
    if (clusterId) {
      where.OR = [{ id: clusterId }, { parentId: clusterId }];
    }

    const hospitals = await this.prisma.organization.findMany({
      where,
      include: {
        organizationType: true,
        departments: { where: { isActive: true } },
        trainerProfiles: { where: { isActive: true }, include: { person: true } },
        _count: {
          select: {
            traineeProfiles: true,
          },
        },
      },
      orderBy: { nameAr: 'asc' },
    });

    const memberCounts = await this.orgAssignments.countMembershipsByOrg(hospitals.map((h) => h.id));

    return Promise.all(
      hospitals.map(async (hosp) => {
        const { capacity, occupied, available, occupancyPercentage } =
          await this.capacityService.getHospitalOccupancy(hosp.id);

        const trainerCount = hosp.trainerProfiles.length;
        const supervisorCount = memberCounts.get(hosp.id) ?? 0;

        return {
          id: hosp.id,
          code: hosp.code,
          nameAr: hosp.nameAr,
          nameEn: hosp.nameEn,
          cityAr: hosp.cityAr || 'طريف',
          cityEn: hosp.cityEn || 'Turaif',
          status: hosp.status,
          capacity,
          occupied,
          available,
          occupancyPercentage,
          departmentsCount: hosp.departments.length,
          departments: hosp.departments.map((d) => ({ id: d.id, nameAr: d.nameAr, capacity: d.capacity })),
          trainerCount,
          supervisorCount,
        };
      }),
    );
  }
}
