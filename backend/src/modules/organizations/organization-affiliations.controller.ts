import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrganizationAffiliationsService } from './organization-affiliations.service';
import { CreateAffiliationDto, UpdateAffiliationDto } from './dto/affiliation.dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { IAuthenticatedUser } from '../../common/interfaces';

@ApiTags('Organization Affiliations (الاتفاقيات بين الجهات)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('organization-affiliations')
export class OrganizationAffiliationsController {
  constructor(private affiliationsService: OrganizationAffiliationsService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة اتفاقيات التدريب والشراكات بين الجهات' })
  @ApiQuery({ name: 'orgId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @RequirePermissions('view_organizations')
  async findAll(
    @Query('orgId') orgId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.affiliationsService.findAll(orgId, +page, +limit);
  }

  @Post()
  @ApiOperation({ summary: 'إنشاء اتفاقية تدريب/شراكة جديدة بين جهتين (مثال: جامعة ↔ مستشفى)' })
  @RequirePermissions('manage_organizations')
  async create(
    @Body() dto: CreateAffiliationDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.affiliationsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث تفاصيل اتفاقية' })
  @RequirePermissions('manage_organizations')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAffiliationDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.affiliationsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'إلغاء/حذف اتفاقية' })
  @RequirePermissions('manage_organizations')
  async remove(@Param('id') id: string) {
    return this.affiliationsService.remove(id);
  }
}
