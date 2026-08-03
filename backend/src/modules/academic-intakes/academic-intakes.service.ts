import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAcademicIntakeDto, UpdateAcademicIntakeDto, AssignTraineesToIntakeDto } from './dto/academic-intake.dto';
import { IAuthenticatedUser } from '../../common/interfaces';

@Injectable()
export class AcademicIntakesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, page = 1, limit = 20, academicYear?: string) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { organizationId: orgId };

    if (academicYear) where.academicYear = academicYear;

    const [total, data] = await Promise.all([
      this.prisma.academicIntake.count({ where }),
      this.prisma.academicIntake.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          program: true,
          coordinator: { include: { person: true } },
          _count: { select: { traineeProfiles: true } },
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
    const intake = await this.prisma.academicIntake.findUnique({
      where: { id },
      include: {
        program: true,
        coordinator: { include: { person: true } },
        traineeProfiles: {
          include: {
            person: true,
            rotations: { include: { department: true } },
          },
        },
      },
    });

    if (!intake) throw new NotFoundException('الدفعة الأكاديمية غير موجودة');
    return intake;
  }

  async create(dto: CreateAcademicIntakeDto, user: IAuthenticatedUser) {
    const existing = await this.prisma.academicIntake.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) throw new ConflictException(`رمز الدفعة الأكاديمية (${dto.code}) مستخدم مسبقاً`);

    return this.prisma.academicIntake.create({
      data: {
        ...dto,
        organizationId: user.organizationId,
        code: dto.code.toUpperCase(),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdById: user.accountId,
      },
      include: { program: true },
    });
  }

  async assignTrainees(id: string, dto: AssignTraineesToIntakeDto) {
    await this.findOne(id);

    await this.prisma.traineeProfile.updateMany({
      where: { id: { in: dto.traineeProfileIds } },
      data: { academicIntakeId: id },
    });

    return { success: true, count: dto.traineeProfileIds.length };
  }

  async update(id: string, dto: UpdateAcademicIntakeDto, user: IAuthenticatedUser) {
    await this.findOne(id);

    return this.prisma.academicIntake.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        updatedById: user.accountId,
      },
    });
  }
}
