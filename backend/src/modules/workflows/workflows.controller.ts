import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDefDto, StartWorkflowDto, ExecuteWorkflowActionDto } from './dto/workflow.dto';
import { CurrentUser, OrgContext, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { IAuthenticatedUser } from '../../common/interfaces';

@ApiTags('Workflows (محرك سير العمل القابل للتعديل - Workflow Engine)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  @Get('definitions')
  @ApiOperation({ summary: 'قائمة تعريفات سير العمل المتاحة' })
  async findAllDefinitions(@OrgContext() orgId: string) {
    return this.workflowsService.findAllDefinitions(orgId);
  }

  @Post('definitions')
  @ApiOperation({ summary: 'إنشاء تعريف سير عمل جديد (Custom Workflow Definition)' })
  @RequirePermissions('manage_organizations')
  async createDefinition(
    @Body() dto: CreateWorkflowDefDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.workflowsService.createDefinition(dto, user);
  }

  @Post('instances/start')
  @ApiOperation({ summary: 'بدء نسخة سير عمل جديدة لكيان محدد (طلب متدرب، بطاقة، روتيشن)' })
  async startWorkflow(
    @Body() dto: StartWorkflowDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.workflowsService.startWorkflow(dto, user);
  }

  @Post('instances/:id/action')
  @ApiOperation({ summary: 'تنفيذ إجراء على سير العمل (موافقة، رفض، إعادة، تصعيد)' })
  async executeAction(
    @Param('id') id: string,
    @Body() dto: ExecuteWorkflowActionDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.workflowsService.executeAction(id, dto, user);
  }

  @Get('instances/:id/history')
  @ApiOperation({ summary: 'سجل الإجراءات والتنقلات لنسخة سير عمل محدده' })
  async getInstanceHistory(@Param('id') id: string) {
    return this.workflowsService.getInstanceHistory(id);
  }
}
