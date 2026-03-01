import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { RedisService } from '../../shared/redis/redis.service';
import { WebsocketConnectionService } from './websocket-connection.service';

@Injectable()
export class WebsocketMessagingService {
  private readonly logger = new Logger(WebsocketMessagingService.name);
  private server: Server;

  constructor(
    private readonly redis: RedisService,
    private readonly connectionService: WebsocketConnectionService,
  ) {}

  /**
   * Установить экземпляр сервера (вызывается из Gateway после инициализации)
   */
  setServer(server: Server) {
    this.server = server;
  }

  /**
   * Отправить сообщение конкретному пользователю
   */
  async sendToUser(userId: string, event: string, data: any) {
    if (this.connectionService.isUserOnline(userId)) {
      this.server.to(`user:${userId}`).emit(event, data);
      return true;
    }

    // Если пользователь оффлайн, сохраняем уведомление для получения позже
    await this.saveOfflineNotification(userId, event, data);
    return false;
  }

  /**
   * Отправить сообщение в комнату мастера
   */
  sendToMaster(masterId: string, event: string, data: any) {
    if (this.server) {
      this.server.to(`master:${masterId}`).emit(event, data);
    }
  }

  /**
   * Отправить сообщение всем администраторам
   */
  sendToAdmins(event: string, data: any) {
    if (this.server) {
      this.server.to('admins').emit(event, data);
    }
  }

  /**
   * Отправить сообщение всем подключенным пользователям
   */
  sendToAll(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
    }
  }

  /**
   * Сохранить уведомление для оффлайн пользователя
   */
  async saveOfflineNotification(userId: string, event: string, data: unknown) {
    try {
      const redisClient = this.redis.getClient();
      if (redisClient.status !== 'ready' && redisClient.status !== 'connect') {
        this.logger.warn(
          `Redis not ready, skipping offline notification for user ${userId}`,
        );
        return;
      }

      const notification: { event: string; data: unknown; timestamp: string } =
        {
          event,
          data,
          timestamp: new Date().toISOString(),
        };

      await redisClient.lpush(
        `notifications:offline:${userId}`,
        JSON.stringify(notification),
      );

      // Ограничиваем историю до 50 записей
      await redisClient.ltrim(`notifications:offline:${userId}`, 0, 49);
    } catch {
      this.logger.warn(
        `Failed to save offline notification for user ${userId}:`,
      );
    }
  }

  /**
   * Получить и удалить накопленные оффлайн уведомления
   */
  async getOfflineNotifications(userId: string) {
    try {
      const redisClient = this.redis.getClient();
      if (redisClient.status !== 'ready' && redisClient.status !== 'connect') {
        this.logger.warn(
          `Redis not ready, returning empty notifications for user ${userId}`,
        );
        return [];
      }

      const notifications = await redisClient.lrange(
        `notifications:offline:${userId}`,
        0,
        -1,
      );

      const parsed = notifications
        .map((n) => {
          try {
            return JSON.parse(n) as Record<string, unknown>;
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to parse notification:`, msg);
            return null;
          }
        })
        .filter((item): item is Record<string, unknown> => Boolean(item));

      await redisClient.del(`notifications:offline:${userId}`);

      return parsed;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to get offline notifications for user ${userId}:`,
        msg,
      );
      return [];
    }
  }
}
