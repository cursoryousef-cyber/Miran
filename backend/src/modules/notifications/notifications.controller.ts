import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { IAuthenticatedUser } from '../../common/interfaces';
import { NotificationService } from './notification.service';

@ApiTags('Notifications (الإشعارات)')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة الإشعارات الخاصة بالمستخدم' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  async findAll(
    @CurrentUser() user: IAuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
  ) {
    return this.notificationService.findAll(user.accountId, +page, +limit, type);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'عدد الإشعارات غير المقروءة' })
  async getUnreadCount(@CurrentUser() user: IAuthenticatedUser) {
    const count = await this.notificationService.getUnreadCount(user.accountId);
    return { data: { count } };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'تحديد إشعار كمقروء' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'تحديد جميع الإشعارات كمقروءة' })
  async markAllAsRead(@CurrentUser() user: IAuthenticatedUser) {
    const result = await this.notificationService.markAllAsRead(user.accountId);
    return { success: true, data: { updated: result.count } };
  }
}
