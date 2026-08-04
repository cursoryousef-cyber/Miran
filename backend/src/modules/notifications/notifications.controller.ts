import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Notifications (الإشعارات)')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@CurrentUser() user: IAuthenticatedUser) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId: user.accountId },
      orderBy: { createdAt: 'desc' },
    });
    return { data: notifications };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser() user: IAuthenticatedUser) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
