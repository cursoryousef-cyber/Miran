import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateReportDto } from './dto/report.dto';
import { IAuthenticatedUser } from '../../common/interfaces';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async findAllDefinitions(orgId?: string) {
    return this.prisma.reportDefinition.findMany({
      where: orgId ? { OR: [{ organizationId: null }, { organizationId: orgId }] } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async generateReport(dto: GenerateReportDto, user: IAuthenticatedUser) {
    const def = await this.prisma.reportDefinition.findUnique({
      where: { id: dto.reportDefinitionId },
    });

    if (!def || !def.isActive) {
      throw new NotFoundException('قالب التقرير غير موجود أو غير مفعّل');
    }

    const rowCount = await this.countRows(def.reportType, user.organizationId);
    const generated = await this.prisma.generatedReport.create({
      data: {
        organizationId: user.organizationId,
        reportDefinitionId: def.id,
        generatedById: user.accountId,
        parameters: (dto.parameters || {}) as unknown as Prisma.InputJsonValue,
        format: dto.format || def.defaultFormat,
        status: 'completed',
        completedAt: new Date(),
        rowCount,
      },
    });

    return {
      reportId: generated.id,
      status: generated.status,
      nameAr: def.nameAr,
      format: generated.format,
      generatedAt: generated.createdAt,
      message: 'تم توليد التقرير بنجاح وجاهز للتحميل',
    };
  }

  async findUserReports(user: IAuthenticatedUser) {
    return this.prisma.generatedReport.findMany({
      where: {
        organizationId: user.organizationId,
        generatedById: user.accountId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        reportDefinition: true,
      },
    });
  }

  private countRows(reportType: string, organizationId: string) {
    switch (reportType) {
      case 'attendance':
        return this.prisma.attendance.count({ where: { organizationId } });
      case 'competencies':
        return this.prisma.competencyProgress.count({
          where: { traineeProfile: { organizationId } },
        });
      case 'evaluations':
        return this.prisma.evaluation.count({ where: { organizationId } });
      case 'logbook':
        return this.prisma.clinicalCaseLog.count({ where: { organizationId } });
      case 'procedures':
        return this.prisma.procedureCatalog.count({ where: { isActive: true } });
      case 'rotation':
      case 'rotations':
        return this.prisma.rotation.count({ where: { organizationId } });
      case 'trainee':
      case 'trainees':
        return this.prisma.traineeProfile.count({ where: { organizationId } });
      default:
        return this.prisma.generatedReport.count({ where: { organizationId } });
    }
  }
}
