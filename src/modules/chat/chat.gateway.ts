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
import { Logger, UseGuards, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { ChatService } from './chat.service';
import {
  CHAT_BROADCAST_EVENT,
  type ChatBroadcastPayload,
} from './chat-broadcast.service';
import { SendMessageWsDto, TypingDto } from './dto';
import type {
  JwtPayload,
  OutgoingChatMessage,
  SocketAuthData,
} from './chat.types';
import { getChatUserFromSocket } from './utils/chat-gateway.utils';
import { ChatGatewayNotificationService } from './services/chat-gateway-notification.service';

@WebSocketGateway({
  cors: {
    origin:
      process.env.FRONTEND_URL ||
      (process.env.NODE_ENV === 'production' ? '*' : 'http://localhost:3000'),
    credentials: true,
  },
  namespace: 'chat',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})
export class ChatGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  private broadcastHandler = (payload: ChatBroadcastPayload) => {
    const { conversationId, outcome } = payload;
    this.emitToConversation(conversationId, 'chat:message', {
      ...outcome.message,
      conversationId,
    });
    this.notifyNewMessage(outcome.message, conversationId);
    if (outcome.autoReply) {
      this.emitToConversation(conversationId, 'chat:message', {
        ...outcome.autoReply,
        conversationId,
      });
      this.notifyNewMessage(outcome.autoReply, conversationId);
    }
  };

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationService: ChatGatewayNotificationService,
  ) {}

  afterInit(_server: Server) {
    this.eventEmitter.on(CHAT_BROADCAST_EVENT, this.broadcastHandler);
    this.logger.log('Chat Gateway initialized');
  }

  onModuleDestroy() {
    this.eventEmitter.off(CHAT_BROADCAST_EVENT, this.broadcastHandler);
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Chat connection refused: No token. ID: ${client.id}`);
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });

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
    const user = getChatUserFromSocket(client);
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
      await this.chatService.getConversation(data.conversationId, user);
      void client.join(`conversation:${data.conversationId}`);
      this.logger.log(
        `User ${user.id} joined room: conversation:${data.conversationId}`,
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
    const user = getChatUserFromSocket(client);
    void client.leave(`conversation:${data.conversationId}`);
    this.logger.log(
      `User ${user?.id ?? 'unknown'} left conversation ${data.conversationId}`,
    );
    return { success: true, conversationId: data.conversationId };
  }

  @SubscribeMessage('chat:message')
  @UseGuards(WsJwtGuard)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageWsDto,
  ) {
    const user = getChatUserFromSocket(client);
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
      const result = await this.chatService.sendMessage(
        data.conversationId,
        { content: data.content, fileIds: data.fileIds },
        user,
      );
      this.logger.log(`Message sent in conversation ${data.conversationId}`);
      return { success: true, message: result.message };
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
    const user = getChatUserFromSocket(client);
    client.to(`conversation:${data.conversationId}`).emit('chat:typing', {
      conversationId: data.conversationId,
      userId: user?.id,
      userRole: user?.role,
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
    const user = getChatUserFromSocket(client);
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
      const result = await this.chatService.markAsRead(
        data.conversationId,
        user,
      );
      client.to(`conversation:${data.conversationId}`).emit('chat:read', {
        conversationId: data.conversationId,
        readBy: user.id,
        timestamp: new Date().toISOString(),
      });
      return { success: true, ...result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error marking as read: ${message}`);
      return { success: false, error: message };
    }
  }

  emitToConversation(conversationId: string, event: string, data: unknown) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  notifyNewMessage(message: OutgoingChatMessage, conversationId: string) {
    void this.notificationService
      .notifyOfflineUser(message, conversationId)
      .catch((e) => this.logger.error('notifyOfflineUser failed', e));
  }

  private extractToken(client: Socket): string | undefined {
    const authToken =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : undefined;
    const headerAuth =
      typeof client.handshake.headers?.authorization === 'string'
        ? client.handshake.headers.authorization.replace('Bearer ', '')
        : undefined;
    return authToken ?? headerAuth;
  }
}
