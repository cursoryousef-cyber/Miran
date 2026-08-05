import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
}

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(payload: CreateNotificationPayload) {
    return this.prisma.notification.create({
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
        sentVia: payload.sentVia || 'in_app',
      },
    });
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
