import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotificationType, NotificationStatus } from '@prisma/client';

export interface SaveNotificationParams {
  type: NotificationType;
  recipient: string;
  message: string;
  status: NotificationStatus;
  metadata?: Record<string, any>;
  title?: string;
  userId?: string;
}

@Injectable()
export class NotificationsActionService {
  private readonly logger = new Logger(NotificationsActionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Отметить уведомление как прочитанное
   * @param userId ID пользователя
   * @param notificationId ID уведомления
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.readAt) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  /**
   * Отметить все уведомления пользователя как прочитанные
   * @param userId ID пользователя
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  /**
   * Сохранить уведомление в базу данных
   * @param params Параметры уведомления
   */
  async saveNotification(params: SaveNotificationParams) {
    try {
      const userId = params.userId ?? null;
      const metadata = {
        ...(params.metadata ?? {}),
        ...(params.recipient ? { recipient: params.recipient } : {}),
      };
      const hasMetadata = Object.keys(metadata).length > 0;

      return await this.prisma.notification.create({
        data: {
          type: params.type,
          title: params.title || params.type.toUpperCase(),
          message: params.message,
          status: params.status,
          sentAt: params.status === NotificationStatus.SENT ? new Date() : null,
          ...(hasMetadata ? { metadata } : {}),
          userId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to save notification to database:', error);
      throw error;
    }
  }

  /**
   * Удалить конкретное уведомление
   * @param userId ID пользователя
   * @param notificationId ID уведомления
   */
  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { deleted: true };
  }

  /**
   * Удалить все уведомления пользователя
   * @param userId ID пользователя
   */
  async deleteAllNotifications(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return { deleted: result.count };
  }
}
