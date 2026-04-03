import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { RedisService } from '../../../shared/redis/redis.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { SocketData, WebsocketJwtPayload } from '../types';

export type { SocketData };

@Injectable()
export class WebsocketConnectionService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(WebsocketConnectionService.name);
  private userConnections = new Map<string, string[]>(); // userId -> socketIds
  /** Grace period (ms) before setting master offline after last socket disconnects */
  private readonly OFFLINE_GRACE_MS = 5_000;
  /** Pending offline timers keyed by userId */
  private offlineTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * On server startup, reset all masters to offline (clean slate).
   * Real online status will be set when masters reconnect via WebSocket.
   */
  async onModuleInit() {
    try {
      const { count } = await this.prisma.master.updateMany({
        where: { isOnline: true },
        data: { isOnline: false },
      });
      if (count > 0) {
        this.logger.log(`Server startup: reset ${count} master(s) to offline`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to reset masters online status: ${msg}`);
    }
  }

  /**
   * Обработка нового подключения пользователя
   * @param client Объект сокета
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.getTokenFromSocket(client);

      if (!token) {
        client.disconnect();
        return null;
      }

      const payload = this.jwtService.verify<WebsocketJwtPayload>(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });

      const userId = payload.sub;
      (client.data as SocketData).userId = userId;
      (client.data as SocketData).role = payload.role;

      // Cancel any pending offline timer for this user (reconnected within grace period)
      const pendingTimer = this.offlineTimers.get(userId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        this.offlineTimers.delete(userId);
      }

      // Сохраняем соединение в локальной мапе
      const userSockets = this.userConnections.get(userId) ?? [];
      userSockets.push(client.id);
      this.userConnections.set(userId, userSockets);

      // Подписываем сокет на комнаты
      await client.join(`user:${userId}`);

      if (payload.role === UserRole.MASTER) {
        await client.join('masters');
        try {
          const master = await this.prisma.master.findUnique({
            where: { userId },
            select: { id: true },
          });
          if (master) {
            await client.join(`master:${master.id}`);
            this.logger.log(`Master ${userId} joined room master:${master.id}`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to subscribe master to room: ${msg}`);
        }

        // Auto-set master online
        await this.setMasterOnlineStatus(userId, true);
      }
      if (payload.role === UserRole.ADMIN) {
        await client.join('admins');
      }

      // Обновляем статус в Redis (с защитой от ошибок)
      try {
        if (this.redis.isAvailable()) {
          const redisClient = this.redis.getClient();
          await redisClient.sadd('online:users', userId);
          await redisClient.hset(`user:${userId}:status`, {
            online: 'true',
            lastSeen: new Date().toISOString(),
          });
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to update Redis status for user ${userId}:`,
          msg,
        );
      }

      this.logger.log(`User connected: ${userId} (socket: ${client.id})`);
      return userId;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Websocket connection error: ${msg}`);
      client.disconnect();
      return null;
    }
  }

  /**
   * Обработка отключения пользователя
   * @param client Объект сокета
   */
  async handleDisconnect(client: Socket) {
    const socketData = client.data as SocketData;
    const userId = socketData.userId;
    const role = socketData.role;

    if (userId) {
      const userSockets = this.userConnections.get(userId) ?? [];
      const updatedSockets = userSockets.filter((id) => id !== client.id);

      if (updatedSockets.length === 0) {
        this.userConnections.delete(userId);

        // Обновляем статус оффлайн в Redis (с защитой от ошибок)
        try {
          if (this.redis.isAvailable()) {
            const redisClient = this.redis.getClient();
            await redisClient.srem('online:users', userId);
            await redisClient.hset(`user:${userId}:status`, {
              online: 'false',
              lastSeen: new Date().toISOString(),
            });
          }
        } catch (error: unknown) {
          if (!this.redis.isAvailable()) return;
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Failed to update Redis offline status for user ${userId}:`,
            msg,
          );
        }

        // Auto-set master offline with grace period (handles page refresh / brief disconnects)
        if (role === UserRole.MASTER) {
          const timer = setTimeout(() => {
            this.offlineTimers.delete(userId);
            // Re-check: if user reconnected during grace period, skip
            if (this.isUserOnline(userId)) return;
            this.setMasterOnlineStatus(userId, false).catch((err) => {
              const msg = err instanceof Error ? err.message : String(err);
              this.logger.warn(`Failed to set master offline: ${msg}`);
            });
          }, this.OFFLINE_GRACE_MS);
          this.offlineTimers.set(userId, timer);
        }

        this.logger.log(`User fully disconnected (offline): ${userId}`);
        return { userId, isLastConnection: true };
      } else {
        this.userConnections.set(userId, updatedSockets);
        this.logger.log(`One of user connections closed: ${userId}`);
      }
    }
    return { userId, isLastConnection: false };
  }

  /**
   * Проверить, онлайн ли пользователь (есть ли активные сокеты)
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userConnections.get(userId);
    return !!sockets && sockets.length > 0;
  }

  /**
   * Получить список всех онлайн пользователей с их статусами из Redis
   */
  async getOnlineUsers() {
    try {
      if (!this.redis.isAvailable()) {
        return [];
      }
      const redisClient = this.redis.getClient();

      const userIds = await redisClient.smembers('online:users');

      const usersWithStatus = await Promise.all(
        userIds.map(async (userId) => {
          try {
            const status = await redisClient.hgetall(`user:${userId}:status`);
            return { userId, ...status };
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to get status for user ${userId}:`, msg);
            return { userId };
          }
        }),
      );

      return usersWithStatus;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to get online users from Redis:', msg);
      return [];
    }
  }

  /**
   * Update master's isOnline + lastActivityAt in the database.
   */
  private async setMasterOnlineStatus(userId: string, isOnline: boolean) {
    try {
      await this.prisma.master.updateMany({
        where: { userId },
        data: {
          isOnline,
          lastActivityAt: new Date(),
        },
      });
      this.logger.log(`Master ${userId} isOnline → ${isOnline}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to update master online status: ${msg}`);
    }
  }

  private getTokenFromSocket(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const authToken = auth?.token;
    const authHeader = client.handshake.headers?.authorization;
    const headerToken =
      typeof authHeader === 'string' ? authHeader.split(' ')[1] : undefined;
    const token =
      (typeof authToken === 'string' ? authToken : null) ??
      (typeof headerToken === 'string' ? headerToken : null);
    return token;
  }

  onModuleDestroy() {
    // Clear all pending offline timers
    for (const timer of this.offlineTimers.values()) {
      clearTimeout(timer);
    }
    this.offlineTimers.clear();

    // Очищаем все соединения при уничтожении модуля для предотвращения утечек памяти
    this.userConnections.clear();
    this.logger.log(
      'WebsocketConnectionService: очищены все соединения пользователей',
    );
  }
}
