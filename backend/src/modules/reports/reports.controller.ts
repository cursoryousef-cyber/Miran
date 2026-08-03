import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/report.dto';
import { CurrentUser, OrgContext, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { IAuthenticatedUser } from '../../common/interfaces';

@ApiTags('Reporting Service (خدمة التقارير والتحليلات المستقلة)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('definitions')
  @ApiOperation({ summary: 'قائمة قوالب التقارير المتاحة' })
  @RequirePermissions('view_reports')
  async findAllDefinitions(@OrgContext() orgId: string) {
    return this.reportsService.findAllDefinitions(orgId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'طلب توليد تقرير (المتدربين، الحضور، الروتيشنات، الانضباط)' })
  @RequirePermissions('view_reports')
  async generateReport(
    @Body() dto: GenerateReportDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.reportsService.generateReport(dto, user);
  }

  @Get('my-reports')
  @ApiOperation({ summary: 'سجل التقارير التي قمت بتوليدها ومسوداتها' })
  @RequirePermissions('view_reports')
  async findUserReports(@CurrentUser() user: IAuthenticatedUser) {
    return this.reportsService.findUserReports(user);
  }
}
