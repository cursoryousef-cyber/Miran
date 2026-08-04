import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, RequireRoles } from '../../common/decorators';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Calls (النداءات الطارئة)')
@Controller('calls')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class CallsController {
  constructor(private prisma: PrismaService) {}

  // ─── للمدربين ومديري الجهات فقط ───────────────────────────────────────────
  @Get('active')
  @RequireRoles('trainer', 'org_manager')
  @ApiOperation({ summary: 'عرض النداءات النشطة — للمدرب ومدير الجهة فقط' })
  async getActiveCalls(@CurrentUser() user: IAuthenticatedUser) {
    const calls = await this.prisma.trainerCall.findMany({
      where: { organizationId: user.organizationId, status: 'active' },
      include: {
        participants: {
          include: { traineeProfile: { include: { person: true } } },
        },
      },
      orderBy: { launchedAt: 'desc' },
    });
    return { data: calls };
  }

  @Post('launch')
  @RequireRoles('trainer', 'org_manager')
  @ApiOperation({ summary: 'إطلاق نداء جديد — للمدرب ومدير الجهة فقط' })
  async launchCall(@CurrentUser() user: IAuthenticatedUser, @Body() dto: any) {
    const trainerProfile = await this.prisma.trainerProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });

    const call = await this.prisma.trainerCall.create({
      data: {
        organizationId: user.organizationId,
        departmentId: trainerProfile?.departmentId ?? dto.departmentId,
        trainerProfileId: trainerProfile?.id ?? dto.trainerProfileId,
        callType: dto.callType || 'urgent',
        customTitle: dto.customTitle,
        note: dto.note,
        location: dto.location,
        expectedMinutes: dto.expectedMinutes || 15,
        launchedAt: new Date(),
        status: 'active',
      },
    });

    // إشعار جميع المتدربين في القسم
    if (call.departmentId) {
      const trainees = await this.prisma.traineeProfile.findMany({
        where: { organizationId: user.organizationId },
        include: { person: { include: { userAccounts: { select: { id: true } } } } },
      });

      for (const trainee of trainees) {
        // إضافة كمشارك
        await this.prisma.callParticipant.create({
          data: {
            callId: call.id,
            traineeProfileId: trainee.id,
            state: 'notified',
            notifiedAt: new Date(),
          },
        });

        // إشعار
        const accountId = trainee.person?.userAccounts?.[0]?.id;
        if (accountId) {
          await this.prisma.notification.create({
            data: {
              organizationId: user.organizationId,
              userId: accountId,
              titleAr: `نداء جديد: ${dto.customTitle || call.callType}`,
              bodyAr: dto.note || 'يرجى التوجه فوراً',
              type: 'call_alert',
              isRead: false,
            },
          });
        }
      }
    }

    return { success: true, call };
  }

  // ─── للمتدربين فقط (الرد على النداء) ──────────────────────────────────────
  @Post(':id/ack')
  @RequireRoles('trainee')
  @ApiOperation({ summary: 'تأكيد استلام النداء — للمتدرب فقط' })
  async acknowledgeCall(@Param('id') callId: string, @CurrentUser() user: IAuthenticatedUser) {
    const traineeProfile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });
    if (!traineeProfile) return { message: 'ليس متدرباً' };

    const participant = await this.prisma.callParticipant.findFirst({
      where: { callId, traineeProfileId: traineeProfile.id },
    });
    if (!participant) return { message: 'غير مشارك في النداء' };

    return this.prisma.callParticipant.update({
      where: { id: participant.id },
      data: { state: 'acknowledged', ackAt: new Date() },
    });
  }

  @Post(':id/on-way')
  @RequireRoles('trainee')
  @ApiOperation({ summary: 'أنا في الطريق — للمتدرب فقط' })
  async onWay(@Param('id') callId: string, @CurrentUser() user: IAuthenticatedUser) {
    const traineeProfile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });
    if (!traineeProfile) return { message: 'ليس متدرباً' };

    const participant = await this.prisma.callParticipant.findFirst({
      where: { callId, traineeProfileId: traineeProfile.id },
    });
    if (!participant) return { message: 'غير مشارك في النداء' };

    return this.prisma.callParticipant.update({
      where: { id: participant.id },
      data: { state: 'self_arrived', selfArrivedAt: new Date() },
    });
  }

  @Post(':id/arrived')
  @RequireRoles('trainee')
  @ApiOperation({ summary: 'وصلت — للمتدرب فقط' })
  async arrived(@Param('id') callId: string, @CurrentUser() user: IAuthenticatedUser) {
    const traineeProfile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });
    if (!traineeProfile) return { message: 'ليس متدرباً' };

    const participant = await this.prisma.callParticipant.findFirst({
      where: { callId, traineeProfileId: traineeProfile.id },
    });
    if (!participant) return { message: 'غير مشارك في النداء' };

    return this.prisma.callParticipant.update({
      where: { id: participant.id },
      data: { state: 'confirmed_arrived', confirmedAt: new Date() },
    });
  }

  // ─── للمتدرب: نداءاته المستلمة ────────────────────────────────────────────
  @Get('my-incoming')
  @RequireRoles('trainee')
  @ApiOperation({ summary: 'النداءات الواردة للمتدرب — للمتدرب فقط' })
  async getMyIncomingCalls(@CurrentUser() user: IAuthenticatedUser) {
    const traineeProfile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });
    if (!traineeProfile) return { data: [] };

    const participants = await this.prisma.callParticipant.findMany({
      where: { traineeProfileId: traineeProfile.id },
      include: { call: true },
      orderBy: { notifiedAt: 'desc' },
    });
    return { data: participants };
  }
}
