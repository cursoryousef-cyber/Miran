import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTrainingRequestDto, UpdateTrainingRequestDto } from './dto/training-request.dto';
import { IAuthenticatedUser } from '../../common/interfaces';

@Injectable()
export class TrainingRequestsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (orgId) {
      where.OR = [{ sourceOrgId: orgId }, { targetOrgId: orgId }];
    }

    const [total, data] = await Promise.all([
      this.prisma.trainingRequest.count({ where }),
      this.prisma.trainingRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sourceOrg: true,
          targetOrg: true,
          program: true,
          academicIntake: true,
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
    const request = await this.prisma.trainingRequest.findUnique({
      where: { id },
      include: {
        sourceOrg: true,
        targetOrg: true,
        program: true,
        academicIntake: true,
      },
    });

    if (!request) {
      throw new NotFoundException('طلب التدريب غير موجود');
    }

    return { data: request };
  }

  async create(dto: CreateTrainingRequestDto, user?: IAuthenticatedUser) {
    const reqCount = await this.prisma.trainingRequest.count();
    const requestNumber = `TR-${new Date().getFullYear()}-${(reqCount + 1).toString().padStart(4, '0')}`;
    const sourceOrgId = user?.organizationId || dto.targetOrgId;

    const created = await this.prisma.trainingRequest.create({
      data: {
        requestNumber,
        sourceOrgId,
        targetOrgId: dto.targetOrgId,
        programId: dto.programId,
        academicIntakeId: dto.academicIntakeId,
        studentCount: dto.studentCount,
        priority: dto.priority || 'normal',
        notes: dto.notes,
        status: 'submitted',
        createdById: user?.accountId,
      },
      include: {
        sourceOrg: true,
        targetOrg: true,
        program: true,
        academicIntake: true,
      },
    });

    return { data: created };
  }

  async update(id: string, dto: UpdateTrainingRequestDto, user?: IAuthenticatedUser) {
    const existing = await this.prisma.trainingRequest.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('طلب التدريب غير موجود');
    }

    const updated = await this.prisma.trainingRequest.update({
      where: { id },
      data: {
        status: dto.status || existing.status,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        allocations: (dto.allocations || existing.allocations) as any,
        updatedById: user?.accountId,
      },
      include: {
        sourceOrg: true,
        targetOrg: true,
        program: true,
        academicIntake: true,
      },
    });

    return { data: updated };
  }
}
