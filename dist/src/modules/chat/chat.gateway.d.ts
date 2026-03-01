import type { Server, Socket } from 'socket.io';
import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { SendMessageWsDto, TypingDto } from './dto';
import { WebsocketService } from '../websocket/websocket.service';
import { InAppNotificationService } from '../notifications/services/in-app-notification.service';
interface SendMessageResult {
    id: string;
    senderType: string;
    conversation?: {
        id: string;
        clientId: string | null;
        masterUserId?: string;
    };
}
export declare class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    private readonly websocketService;
    private readonly inAppNotifications;
    server: Server;
    private readonly logger;
    private userConversations;
    constructor(chatService: ChatService, websocketService: WebsocketService, inAppNotifications: InAppNotificationService);
    afterInit(_server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinConversation(client: Socket, data: {
        conversationId: string;
    }): Promise<{
        success: boolean;
        error: string;
        conversationId?: undefined;
    } | {
        success: boolean;
        conversationId: string;
        error?: undefined;
    }>;
    handleLeaveConversation(client: Socket, data: {
        conversationId: string;
    }): {
        success: boolean;
        conversationId: string;
    };
    handleSendMessage(client: Socket, data: SendMessageWsDto): Promise<{
        success: boolean;
        error: string;
        message?: undefined;
    } | {
        success: boolean;
        message: import("./chat.service").OutgoingChatMessage;
        error?: undefined;
    }>;
    handleTyping(client: Socket, data: TypingDto): {
        success: boolean;
    };
    handleMarkAsRead(client: Socket, data: {
        conversationId: string;
    }): Promise<{
        success: boolean;
        error: string;
    } | {
        count: number;
        success: boolean;
        error?: undefined;
    }>;
    private notifyOfflineUser;
    emitToConversation(conversationId: string, event: string, data: unknown): void;
    notifyNewMessage(message: SendMessageResult, conversationId: string): void;
}
export {};
