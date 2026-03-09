import type { Server, Socket } from 'socket.io';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { UserRole } from '@prisma/client';
import { ChatService } from './chat.service';
import { SendMessageWsDto, TypingDto } from './dto';
import { WebsocketService } from '../websocket/websocket.service';
import { InAppNotificationService } from '../notifications/services/in-app-notification.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Shape of client.data set by WsJwtGuard */
interface SocketAuthData {
  userId?: string;
  userRole?: string;
}

interface JwtPayload {
  sub: string;
  role?: UserRole;
}

/** Shape of message returned from ChatService.sendMessage (for offline notification) */
interface SendMessageResult {
  id: string;
  senderType: string;
  conversation?: {
    id: string;
    clientId: string | null;
    clientPhone?: string | null;
    masterUserId?: string;
    masterName?: string;
  };
}

const USER_ROLES: UserRole[] = ['ADMIN', 'CLIENT', 'MASTER'];

function parseUserRole(value: string): UserRole | undefined {
  return USER_ROLES.includes(value as UserRole)
    ? (value as UserRole)
    : undefined;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'chat',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => WebsocketService))
    private readonly websocketService: WebsocketService,
    @Inject(forwardRef(() => InAppNotificationService))
    private readonly inAppNotifications: InAppNotificationService,
    private readonly notifications: NotificationsService,
  ) {}

  afterInit(_server: Server) {
    this.logger.log('Chat Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token: string | undefined =
        (typeof client.handshake.auth?.token === 'string'
          ? client.handshake.auth.token
          : undefined) ??
        (typeof client.handshake.headers?.authorization === 'string'
          ? client.handshake.headers.authorization.replace('Bearer ', '')
          : undefined);

      if (!token) {
        this.logger.warn(`Chat connection refused: No token. ID: ${client.id}`);
        client.disconnect(true);
        return;
      }

      // SECURITY: Verify token immediately on connection to prevent DoS by unauth users
      // This ensures only valid users can hold a connection open.
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });

      // Save user data to socket for later use in SubscribeMessages
      const socketData = client.data as SocketAuthData;
      socketData.userId = payload.sub;
      socketData.userRole = payload.role;

      this.logger.log(
        `Chat client authenticated: ${payload.sub} (${client.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Chat auth error for ${client.id}: ${error instanceof Error ? error.message : 'Invalid token'}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:join')
  @UseGuards(WsJwtGuard)
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const socketData = client.data as SocketAuthData;
      const userId =
        typeof socketData.userId === 'string' ? socketData.userId : undefined;
      const userRole = parseUserRole(
        typeof socketData.userRole === 'string' ? socketData.userRole : '',
      );
      if (!userId || !userRole) {
        return { success: false, error: 'Unauthorized' };
      }
      const user = { id: userId, role: userRole };

      // Verify user has access to this conversation in DB
      await this.chatService.getConversation(data.conversationId, user);

      void client.join(`conversation:${data.conversationId}`);

      this.logger.log(
        `User ${userId} joined room: conversation:${data.conversationId}`,
      );

      return { success: true, conversationId: data.conversationId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error joining conversation: ${message}`);
      return { success: false, error: message };
    }
  }

  @SubscribeMessage('chat:leave')
  @UseGuards(WsJwtGuard)
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const socketData = client.data as SocketAuthData;
    const userId =
      typeof socketData.userId === 'string' ? socketData.userId : undefined;
    void client.leave(`conversation:${data.conversationId}`);

    this.logger.log(
      `User ${userId ?? 'unknown'} left conversation ${data.conversationId}`,
    );
    return { success: true, conversationId: data.conversationId };
  }

  @SubscribeMessage('chat:message')
  @UseGuards(WsJwtGuard)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageWsDto,
  ) {
    try {
      const socketData = client.data as SocketAuthData;
      const userId =
        typeof socketData.userId === 'string' ? socketData.userId : undefined;
      const userRole = parseUserRole(
        typeof socketData.userRole === 'string' ? socketData.userRole : '',
      );
      if (!userId || !userRole) {
        return { success: false, error: 'Unauthorized' };
      }
      const user = { id: userId, role: userRole };

      const result = await this.chatService.sendMessage(
        data.conversationId,
        { content: data.content, fileIds: data.fileIds },
        user,
      );
      const { message, autoReply } = result;

      // Broadcast to all clients in the conversation room
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('chat:message', {
          ...message,
          conversationId: data.conversationId,
        });

      // Send notification to offline users
      await this.notifyOfflineUser(message, data.conversationId);

      if (autoReply) {
        this.server
          .to(`conversation:${data.conversationId}`)
          .emit('chat:message', {
            ...autoReply,
            conversationId: data.conversationId,
          });
        await this.notifyOfflineUser(autoReply, data.conversationId);
      }

      this.logger.log(`Message sent in conversation ${data.conversationId}`);

      return { success: true, message };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sending message: ${message}`);
      return { success: false, error: message };
    }
  }

  @SubscribeMessage('chat:typing')
  @UseGuards(WsJwtGuard)
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingDto,
  ) {
    const socketData = client.data as SocketAuthData;
    const userId =
      typeof socketData.userId === 'string' ? socketData.userId : undefined;
    const userRole =
      typeof socketData.userRole === 'string' ? socketData.userRole : undefined;

    // Broadcast typing status to other users in the conversation
    client.to(`conversation:${data.conversationId}`).emit('chat:typing', {
      conversationId: data.conversationId,
      userId,
      userRole,
      isTyping: data.isTyping,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('chat:read')
  @UseGuards(WsJwtGuard)
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const socketData = client.data as SocketAuthData;
      const userId =
        typeof socketData.userId === 'string' ? socketData.userId : undefined;
      const userRole = parseUserRole(
        typeof socketData.userRole === 'string' ? socketData.userRole : '',
      );
      if (!userId || !userRole) {
        return { success: false, error: 'Unauthorized' };
      }
      const user = { id: userId, role: userRole };

      const result = await this.chatService.markAsRead(
        data.conversationId,
        user,
      );

      // Notify other users in the conversation
      client.to(`conversation:${data.conversationId}`).emit('chat:read', {
        conversationId: data.conversationId,
        readBy: userId,
        timestamp: new Date().toISOString(),
      });

      return { success: true, ...result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error marking as read: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Send notification to offline user via main notification system (user room)
   */
  private async notifyOfflineUser(
    message: SendMessageResult,
    conversationId: string,
  ) {
    try {
      const conversation = message.conversation;
      if (!conversation) return;

      const recipientUserId =
        message.senderType === 'MASTER'
          ? conversation.clientId
          : (conversation.masterUserId ?? null);

      if (recipientUserId) {
        // In-app: сохранение в БД + отправка по WebSocket (единый канал)
        await this.inAppNotifications
          .notifyNewChatMessage(recipientUserId, {
            conversationId,
            messageId: message.id,
            senderType: message.senderType,
          })
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(`Failed to save in-app chat notification: ${msg}`);
          });

        // MASTER_RESPONDED: SMS клиенту, когда мастер отвечает
        if (
          message.senderType === 'MASTER' &&
          conversation.clientId === recipientUserId &&
          conversation.clientPhone
        ) {
          const masterName = conversation.masterName || 'Мастер';
          const smsText = `${masterName} ответил вам в чате. Откройте приложение для просмотра.`;
          await this.notifications
            .sendSMS(conversation.clientPhone, smsText)
            .catch((e: unknown) => {
              const msg = e instanceof Error ? e.message : String(e);
              this.logger.warn(`Failed to send MASTER_RESPONDED SMS: ${msg}`);
            });
        }
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error notifying offline user: ${errMessage}`);
    }
  }

  /**
   * Emit event to specific conversation (for external use, e.g. after REST sendMessage)
   */
  emitToConversation(conversationId: string, event: string, data: unknown) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  /**
   * Notify the other party about a new message (e.g. when sent via REST)
   */
  notifyNewMessage(message: SendMessageResult, conversationId: string) {
    void this.notifyOfflineUser(message, conversationId);
  }
}
