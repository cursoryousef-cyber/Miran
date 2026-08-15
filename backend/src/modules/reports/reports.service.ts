import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateReportDto } from './dto/report.dto';
import { IAuthenticatedUser } from '../../common/interfaces';
import { Prisma } from '@prisma/client';
import { ScopeContextService } from '../../common/authz/scope-context.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private scopeContext: ScopeContextService,
  ) {}

  /**
   * Definitions visible to the caller: the global ones plus any owned by an
   * organisation inside their scope. A cluster manager's own `organizationId` is
   * the cluster, while report definitions are owned by the hospitals beneath it,
   * so matching on that one id alone hid every definition from them.
   */
  async findAllDefinitions(user: IAuthenticatedUser) {
    const scope = await this.scopeContext.resolve(user);
    const visibleIds = scope.visibleOrgIds;

    return this.prisma.reportDefinition.findMany({
      where: visibleIds === null
        ? {}
        : { OR: [{ organizationId: null }, { organizationId: { in: visibleIds } }] },
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

    const rowCount = await this.countRows(def.reportType, user);
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

  /**
   * Row count behind a report, over every organisation the caller can see.
   *
   * Counting on `user.organizationId` alone returned 0 for any parent-level role:
   * a cluster manager sits on the cluster while the incidents, rotations and
   * trainees they are responsible for belong to the hospitals under it. This
   * mirrors the scope the incidents and trainee screens already read with.
   */
  private async countRows(reportType: string, user: IAuthenticatedUser) {
    const scope = await this.scopeContext.resolve(user);
    const orgIds = scope.visibleOrgIds;
    // A platform-wide scope is `null` — no organisation filter at all.
    const orgWhere = orgIds === null ? {} : { organizationId: { in: orgIds } };

    switch (reportType) {
      case 'attendance':
        return this.prisma.attendance.count({ where: orgWhere });
      case 'competencies':
        return this.prisma.competencyProgress.count({
          where: { traineeProfile: orgIds === null ? {} : { organizationId: { in: orgIds } } },
        });
      case 'evaluations':
        return this.prisma.evaluation.count({ where: orgWhere });
      case 'logbook':
        return this.prisma.clinicalCaseLog.count({ where: orgWhere });
      case 'procedures':
        return this.prisma.procedureCatalog.count({ where: { isActive: true } });
      case 'incident':
      case 'incidents':
        return this.prisma.incident.count({ where: orgWhere });
      case 'training_request':
      case 'training_requests':
        return this.prisma.trainingRequest.count({
          where: orgIds === null ? {} : { targetOrgId: { in: orgIds } },
        });
      case 'rotation':
      case 'rotations':
        return this.prisma.rotation.count({ where: orgWhere });
      case 'trainee':
      case 'trainees':
        return this.prisma.traineeProfile.count({ where: orgWhere });
      default:
        return this.prisma.generatedReport.count({ where: orgWhere });
    }
  }
}
