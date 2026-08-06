import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailChannelService } from './channels/email-channel.service';
import { PushChannelService } from './channels/push-channel.service';
import { NotificationChannel } from './channels/notification-channel.interface';

export type NotificationChannelName = 'in_app' | 'email' | 'push';

export interface CreateNotificationPayload {
  organizationId: string;
  userId: string;
  titleAr: string;
  titleEn?: string;
  bodyAr?: string;
  bodyEn?: string;
  type: string;
  referenceType?: string;
  referenceId?: string;
  sentVia?: string;
  channels?: NotificationChannelName[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private emailChannel: EmailChannelService,
    private pushChannel: PushChannelService,
  ) {}

  async create(payload: CreateNotificationPayload) {
    const notification = await this.prisma.notification.create({
      data: {
        organizationId: payload.organizationId,
        userId: payload.userId,
        titleAr: payload.titleAr,
        titleEn: payload.titleEn || '',
        bodyAr: payload.bodyAr,
        bodyEn: payload.bodyEn,
        type: payload.type,
        referenceType: payload.referenceType,
        referenceId: payload.referenceId,
        sentVia: payload.channels?.join(',') || payload.sentVia || 'in_app',
      },
    });

    await this.fanOut(payload);
    return notification;
  }

  /**
   * Delivers to the external channels requested by the caller. Never throws —
   * a failed email/push must not roll back the in-app notification or the
   * workflow transition that triggered it.
   */
  private async fanOut(payload: CreateNotificationPayload) {
    const requested = payload.channels || [];
    const externals: NotificationChannel[] = [];
    if (requested.includes('email')) externals.push(this.emailChannel);
    if (requested.includes('push')) externals.push(this.pushChannel);
    if (externals.length === 0) return;

    const account = await this.prisma.userAccount.findUnique({
      where: { id: payload.userId },
      select: { email: true },
    });

    for (const channel of externals) {
      if (!channel.isConfigured()) continue;
      try {
        await channel.send({
          userId: payload.userId,
          email: account?.email,
          title: payload.titleAr,
          body: payload.bodyAr,
          data: payload.referenceId
            ? { referenceType: payload.referenceType || '', referenceId: payload.referenceId }
            : undefined,
        });
      } catch (e) {
        this.logger.warn(`تعذر الإرسال عبر قناة ${channel.name}: ${(e as Error).message}`);
      }
    }
  }

  async createBulk(payloads: CreateNotificationPayload[]) {
    const results: any[] = [];
    for (const payload of payloads) {
      const n = await this.create(payload);
      results.push(n);
    }
    return results;
  }

  async notifyOrgUsers(orgId: string, roleCode: string, notification: Omit<CreateNotificationPayload, 'userId' | 'organizationId'>) {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        organizationId: orgId,
        role: { code: roleCode },
      },
      select: { userAccountId: true },
    });

    const payloads: CreateNotificationPayload[] = userRoles.map((ur) => ({
      ...notification,
      organizationId: orgId,
      userId: ur.userAccountId,
    }));

    return this.createBulk(payloads);
  }

  async findAll(userId: string, page = 1, limit = 20, type?: string) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { userId };
    if (type) where.type = type;

    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
