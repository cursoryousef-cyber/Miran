import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationHierarchyService } from './organization-hierarchy.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { IAuthenticatedUser } from '../../common/interfaces';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private hierarchyService: OrganizationHierarchyService,
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
              userOrganizations: true,
              traineeProfiles: true,
              trainerProfiles: true,
              departments: true,
            },
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
            userOrganizations: true,
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

    return org;
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
}
