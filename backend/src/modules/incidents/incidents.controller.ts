import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequireRoles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CAPABILITIES, CapabilityGuard, RequireCapability,
} from '../../common/authz';

const VALID_STATUSES = ['open', 'under_review', 'resolved', 'closed'];

@ApiTags('Incidents (البلاغات والحوادث)')
@ApiBearerAuth('JWT-auth')
@Controller('incidents')
@UseGuards(JwtAuthGuard, RolesGuard, CapabilityGuard)
export class IncidentsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequireCapability(CAPABILITIES.INCIDENT_VIEW)
  @ApiOperation({ summary: 'قائمة البلاغات للمنظمة' })
  async findAll(
    @CurrentUser() user: IAuthenticatedUser,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const where: any = { organizationId: user.organizationId };
    if (status) where.status = status;
    if (severity) where.severity = severity;
    const skip = (+page - 1) * +limit;
    const [total, data] = await Promise.all([
      this.prisma.incident.count({ where }),
      this.prisma.incident.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reportedBy: { include: { person: true } },
          resolvedBy: { include: { person: true } },
        },
      }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) } };
  }

  @Get(':id')
  @RequireCapability(CAPABILITIES.INCIDENT_VIEW)
  @ApiOperation({ summary: 'تفاصيل البلاغ' })
  async findOne(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    const data = await this.prisma.incident.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { reportedBy: { include: { person: true } }, resolvedBy: { include: { person: true } } },
    });
    return { data };
  }

  @Post()
  @RequireRoles('trainee', 'trainer', 'hospital_administrator', 'hospital_training_admin', 'cluster_administrator', 'cluster_manager')
  @ApiOperation({ summary: 'تقديم بلاغ جديد' })
  async create(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: { incidentType: string; description: string; severity?: string },
  ) {
    const data = await this.prisma.incident.create({
      data: {
        organizationId: user.organizationId,
        reportedById: user.accountId,
        incidentType: dto.incidentType,
        description: dto.description,
        severity: dto.severity ?? 'low',
        status: 'open',
      },
    });
    return { success: true, data };
  }

  @Patch(':id/status')
  @RequireRoles('hospital_administrator', 'hospital_training_admin', 'cluster_administrator', 'cluster_manager', 'platform_owner')
  @ApiOperation({ summary: 'تحديث حالة البلاغ' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: { status: string; resolution?: string },
  ) {
    if (!VALID_STATUSES.includes(dto.status)) {
      throw new BadRequestException(`الحالة غير صحيحة. المتاح: ${VALID_STATUSES.join('، ')}`);
    }
    const isResolved = dto.status === 'resolved' || dto.status === 'closed';
    const data = await this.prisma.incident.update({
      where: { id },
      data: {
        status: dto.status,
        resolution: dto.resolution,
        resolvedById: isResolved ? user.accountId : undefined,
        resolvedAt: isResolved ? new Date() : undefined,
      },
    });
    return { success: true, data };
  }
}
