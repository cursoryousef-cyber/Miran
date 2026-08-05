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
import { UserAccountsService } from './user-accounts.service';
import { CreateUserAccountDto, AddUserToOrgDto, AssignRoleDto } from './dto/user-account.dto';
import { CurrentUser, OrgContext, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { IAuthenticatedUser } from '../../common/interfaces';

@ApiTags('User Accounts (إدارة حسابات الدخول وتعدد الجهات)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('user-accounts')
export class UserAccountsController {
  constructor(private userAccountsService: UserAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة حسابات الدخول في الجهة الحالية' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @RequirePermissions('view_users')
  async findAll(
    @OrgContext() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.userAccountsService.findAll(orgId, +page, +limit, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل حساب دخول محدد والجهات والأدوار المرتبطة' })
  @RequirePermissions('view_users')
  async findOne(@Param('id') id: string) {
    return this.userAccountsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'إنشاء حساب دخول جديد وترخيصه لجهة' })
  @RequirePermissions('manage_users')
  async create(
    @Body() dto: CreateUserAccountDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.userAccountsService.create(dto, user);
  }

  @Post(':id/organizations')
  @ApiOperation({ summary: 'ربط حساب مستخدم بجهة إضافية (Multi-Org Assignment)' })
  @RequirePermissions('manage_users')
  async addUserToOrg(
    @Param('id') id: string,
    @Body() dto: AddUserToOrgDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.userAccountsService.addUserToOrg(id, dto, user);
  }

  @Post('roles/assign')
  @ApiOperation({ summary: 'تعيين دور للمستخدم في جهة محددة' })
  @RequirePermissions('manage_roles')
  async assignRole(
    @Body() dto: AssignRoleDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.userAccountsService.assignRole(dto, user);
  }

  @Delete(':id/roles/:roleId/organizations/:orgId')
  @ApiOperation({ summary: 'سحب دور من المستخدم في جهة محددة' })
  @RequirePermissions('manage_roles')
  async removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Param('orgId') orgId: string,
  ) {
    return this.userAccountsService.removeRole(id, roleId, orgId);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'تفعيل أو إيقاف حساب دخول' })
  @RequirePermissions('manage_users')
  async toggleActive(
    @Param('id') id: string,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.userAccountsService.toggleActive(id, user);
  }
}
