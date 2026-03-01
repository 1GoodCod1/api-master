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
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { UserRole } from '@prisma/client';
import { ChatService } from './chat.service';
import { SendMessageWsDto, TypingDto } from './dto';
import { WebsocketService } from '../websocket/websocket.service';
import { InAppNotificationService } from '../notifications/services/in-app-notification.service';

/** Shape of client.data set by WsJwtGuard */
interface SocketAuthData {
  userId?: string;
  userRole?: string;
}

/** Shape of message returned from ChatService.sendMessage (for offline notification) */
interface SendMessageResult {
  id: string;
  senderType: string;
  conversation?: {
    id: string;
    clientId: string | null;
    masterUserId?: string;
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
  private userConversations: Map<string, Set<string>> = new Map(); // userId -> Set of conversationIds

  constructor(
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => WebsocketService))
    private readonly websocketService: WebsocketService,
    @Inject(forwardRef(() => InAppNotificationService))
    private readonly inAppNotifications: InAppNotificationService,
  ) {}

  afterInit(_server: Server) {
    this.logger.log('Chat Gateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      const token: string | undefined =
        (typeof client.handshake.auth?.token === 'string'
          ? client.handshake.auth.token
          : undefined) ??
        (typeof client.handshake.headers?.authorization === 'string'
          ? client.handshake.headers.authorization.replace('Bearer ', '')
          : undefined);

      if (!token) {
        this.logger.warn('Chat connection without token');
        client.disconnect();
        return;
      }

      this.logger.log(`Chat client connected: ${client.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Chat connection error: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const data = client.data as { userId?: string } | undefined;
    const userId = typeof data?.userId === 'string' ? data.userId : undefined;
    if (userId) {
      const userConvs = this.userConversations.get(userId);
      if (userConvs) {
        userConvs.forEach((convId) => {
          void client.leave(`conversation:${convId}`);
        });
        this.userConversations.delete(userId);
      }
    }
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
      await this.chatService.getConversation(data.conversationId, user);

      void client.join(`conversation:${data.conversationId}`);

      if (!this.userConversations.has(userId)) {
        this.userConversations.set(userId, new Set());
      }
      this.userConversations.get(userId)?.add(data.conversationId);

      this.logger.log(
        `User ${userId} joined conversation ${data.conversationId}`,
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

    if (userId) {
      const userConvs = this.userConversations.get(userId);
      if (userConvs) {
        userConvs.delete(data.conversationId);
      }
    }

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
