import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { WebsocketConnectionService } from './services/websocket-connection.service';
import { WebsocketMessagingService } from './services/websocket-messaging.service';
import { WebsocketErrorHandlerService } from './services/websocket-error-handler.service';
import { RedisService } from '../shared/redis/redis.service';
import { Server, Socket } from 'socket.io';
export declare class WebsocketService implements OnModuleInit, OnModuleDestroy {
    private readonly connectionService;
    private readonly messagingService;
    private readonly redis;
    private readonly errorHandler;
    private readonly logger;
    private redisSubscriber;
    constructor(connectionService: WebsocketConnectionService, messagingService: WebsocketMessagingService, redis: RedisService, errorHandler: WebsocketErrorHandlerService);
    private initTimeout;
    onModuleInit(): void;
    initServer(server: Server): void;
    handleConnection(client: Socket): Promise<string | null>;
    handleDisconnect(client: Socket): Promise<{
        userId: string | undefined;
        isLastConnection: boolean;
    }>;
    sendToUser(userId: string, event: string, data: any): Promise<boolean>;
    sendToMaster(masterId: string, event: string, data: unknown): void;
    sendToAdmins(event: string, data: unknown): void;
    sendToAll(event: string, data: unknown): void;
    getOfflineNotifications(userId: string): Promise<Record<string, unknown>[]>;
    getOnlineUsers(): Promise<{
        userId: string;
    }[]>;
    sendNewLeadNotification(masterId: string, leadData: any, masterUserId?: string): Promise<void>;
    sendLeadSentToClient(clientId: string, payload: {
        leadId: string;
        masterName: string;
    }): Promise<void>;
    sendPaymentNotification(userId: string, paymentData: any): Promise<void>;
    sendReviewNotification(masterId: string, reviewData: any): void;
    private setupRedisSubscriptions;
    private handleSystemNotification;
    onModuleDestroy(): Promise<void>;
}
