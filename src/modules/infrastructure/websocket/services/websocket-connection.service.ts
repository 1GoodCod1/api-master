import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { RedisService } from '../../../shared/redis/redis.service';
import { PrismaService } from '../../../shared/database/prisma.service';

interface JwtPayload {
  sub: string;
  role: UserRole;
}

export interface SocketData {
  userId?: string;
}

@Injectable()
export class WebsocketConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(WebsocketConnectionService.name);
  private userConnections = new Map<string, string[]>(); // userId -> socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

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

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });

      const userId = payload.sub;
      (client.data as SocketData).userId = userId;

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
    const userId = (client.data as SocketData).userId;

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
    // Очищаем все соединения при уничтожении модуля для предотвращения утечек памяти
    this.userConnections.clear();
    this.logger.log(
      'WebsocketConnectionService: очищены все соединения пользователей',
    );
  }
}
