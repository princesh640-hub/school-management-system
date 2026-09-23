import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyNotifications(userId: string, unreadOnly: boolean = false, priority?: string) {
    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }
    if (priority) {
      where.priority = priority;
    }

    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      unreadCount,
      items,
    };
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { message: 'All notifications marked as read', count: result.count };
  }

  /**
   * Internal create hook used by Exam, Timetable, Attendance, etc.
   */
  async create(dto: {
    organizationId: string;
    userId?: string;
    recipientRole?: string;
    title: string;
    message: string;
    type?: string;
    priority?: any;
    category?: string;
    linkUrl?: string;
    campaignId?: string;
  }) {
    if (dto.userId) {
      return this.prisma.notification.create({
        data: {
          organizationId: dto.organizationId,
          userId: dto.userId,
          title: dto.title,
          message: dto.message,
          type: dto.type || 'INFO',
          priority: dto.priority || 'NORMAL',
          category: dto.category,
          linkUrl: dto.linkUrl,
          campaignId: dto.campaignId,
          isRead: false,
        },
      });
    }

    // Role-targeted notification
    if (dto.recipientRole) {
      return this.broadcast(dto.organizationId, {
        title: dto.title,
        message: dto.message,
        type: dto.type || 'INFO',
        targetRole: dto.recipientRole,
        linkUrl: dto.linkUrl,
      });
    }

    return null;
  }

  /**
   * Overloaded broadcast supporting both (sender: CurrentUserPayload, dto)
   * and (organizationId: string, dto) signatures.
   */
  async broadcast(
    senderOrOrgId: CurrentUserPayload | string,
    dto: BroadcastNotificationDto | any,
  ) {
    const organizationId =
      typeof senderOrOrgId === 'string'
        ? senderOrOrgId
        : senderOrOrgId.organizationId;

    const userWhere: any = {
      organizationId,
      status: 'ACTIVE',
    };

    if (dto.targetRole) {
      userWhere.userRoles = {
        some: {
          role: {
            code: dto.targetRole,
          },
        },
      };
    }

    const targetUsers = await this.prisma.user.findMany({
      where: userWhere,
      select: { id: true },
    });

    if (targetUsers.length === 0) {
      return { message: 'No recipients matched the target criteria', recipientsCount: 0 };
    }

    const data = targetUsers.map((u) => ({
      organizationId,
      userId: u.id,
      title: dto.title,
      message: dto.message,
      type: dto.type || 'INFO',
      priority: dto.priority || 'NORMAL',
      linkUrl: dto.linkUrl,
      isRead: false,
    }));

    const result = await this.prisma.notification.createMany({
      data,
    });

    return {
      message: `Broadcast sent to ${result.count} users successfully`,
      recipientsCount: result.count,
    };
  }
}
