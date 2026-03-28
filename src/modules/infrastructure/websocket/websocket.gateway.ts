import type { Server, Socket } from 'socket.io';
import {
  WebSocketGateway as NestWebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { WsJwtGuard } from '../../../common/guards/ws-jwt.guard';
import { WebsocketService } from './websocket.service';
import { WebsocketErrorHandlerService } from './services/websocket-error-handler.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { sanitizeMasterId } from './utils/websocket-sanitizer.util';
import type { SocketData } from './services/websocket-connection.service';
import { WsTypingDto } from './dto/typing.dto';
import { getCorsOrigins } from '../../../config';
import { UserRole } from '@prisma/client';

@NestWebSocketGateway({
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
  },
  namespace: 'notifications',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private prisma: PrismaService | null = null;

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly moduleRef: ModuleRef,
    private readonly errorHandler: WebsocketErrorHandlerService,
  ) {
    this.logger.log('Websocket Gateway constructor');
  }

  // Получаем PrismaService лениво, когда он понадобится
  private getPrismaService(): PrismaService | null {
    if (!this.prisma) {
      try {
        this.prisma = this.moduleRef.get(PrismaService, { strict: false });
        if (!this.prisma) {
          this.logger.warn('PrismaService not found in module');
          return null;
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to get PrismaService: ${msg}`);
        return null;
      }
    }
    return this.prisma;
  }

  afterInit(server: Server) {
    this.logger.log('Websocket Gateway afterInit');
    try {
      this.websocketService.initServer(server);
      this.logger.log('Websocket Gateway initialized successfully');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Gateway initialization failed: ${msg}`);
    }
  }

  async handleConnection(client: Socket) {
    try {
      const userId = await this.websocketService.handleConnection(client);
      if (userId) {
        // Отправляем приветственное сообщение и проверяем оффлайн уведомления
        try {
          const offlineNotifications =
            await this.websocketService.getOfflineNotifications(userId);

          client.emit('connected', {
            message: 'Connected to notifications',
            userId,
            timestamp: new Date().toISOString(),
            offlineCount: offlineNotifications.length,
          });

          for (const notification of offlineNotifications) {
            if (typeof notification.event === 'string') {
              client.emit(notification.event, notification.data);
            }
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Error getting offline notifications: ${msg}`);
          client.emit('connected', {
            message: 'Connected to notifications',
            userId,
            timestamp: new Date().toISOString(),
            offlineCount: 0,
          });
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error in handleConnection: ${msg}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      await this.websocketService.handleDisconnect(client);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error in handleDisconnect: ${msg}`);
    }
  }

  @SubscribeMessage('subscribe:master')
  @UseGuards(WsJwtGuard)
  async handleSubscribeToMaster(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { masterId: string },
  ) {
    try {
      const userId = (client.data as SocketData).userId;

      // Валидация и санитизация входных данных
      this.errorHandler.validateInput(
        data,
        {
          masterId: (value) =>
            typeof value === 'string' && value.trim().length > 0,
        },
        'handleSubscribeToMaster',
      );

      const sanitizedMasterId = sanitizeMasterId(data.masterId);
      if (!sanitizedMasterId) {
        throw this.errorHandler.handleError(
          new Error('Invalid masterId format'),
          'handleSubscribeToMaster',
          userId,
        );
      }

      // ЗАЩИТА: Проверяем, что пользователь может подписаться на этого мастера
      const prisma = this.getPrismaService();
      if (!prisma) {
        this.logger.warn('PrismaService unavailable, skipping validation');
        await client.join(`master:${sanitizedMasterId}`);
        return { success: true, masterId: sanitizedMasterId };
      }

      const user = await this.errorHandler.handleAsyncError(
        () =>
          prisma.user.findUnique({
            where: { id: userId },
            include: { masterProfile: true },
          }),
        'handleSubscribeToMaster - findUser',
        userId,
      );

      if (!user) {
        throw this.errorHandler.handleError(
          new Error('User not found'),
          'handleSubscribeToMaster',
          userId,
        );
      }

      const isMasterOwner =
        user.role === UserRole.MASTER &&
        user.masterProfile?.id === sanitizedMasterId;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!isMasterOwner && !isAdmin) {
        this.logger.warn(
          `Unauthorized subscribe attempt: userId=${userId}, masterId=${sanitizedMasterId}`,
        );
        throw this.errorHandler.handleError(
          new Error('Unauthorized to subscribe to this master'),
          'handleSubscribeToMaster',
          userId,
        );
      }

      await client.join(`master:${sanitizedMasterId}`);
      this.logger.log(
        `User ${userId} subscribed to master:${sanitizedMasterId}`,
      );
      return { success: true, masterId: sanitizedMasterId };
    } catch (error: unknown) {
      if (error instanceof WsException) {
        throw error;
      }
      throw this.errorHandler.handleError(
        error,
        'handleSubscribeToMaster',
        (client.data as SocketData).userId,
      );
    }
  }

  @SubscribeMessage('unsubscribe:master')
  async handleUnsubscribeFromMaster(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { masterId: string },
  ) {
    await client.leave(`master:${data.masterId}`);
    return { success: true, masterId: data.masterId };
  }

  @SubscribeMessage('typing')
  @UseGuards(WsJwtGuard)
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsTypingDto,
  ) {
    const userId = (client.data as SocketData).userId;
    const sanitizedMasterId = sanitizeMasterId(data.masterId);
    if (!sanitizedMasterId) {
      throw new WsException('Invalid masterId');
    }
    this.server.to(`master:${sanitizedMasterId}`).emit('user:typing', {
      userId,
      isTyping: data.isTyping,
      timestamp: new Date().toISOString(),
    });
  }
}
