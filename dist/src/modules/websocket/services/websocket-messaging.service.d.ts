import { Server } from 'socket.io';
import { RedisService } from '../../shared/redis/redis.service';
import { WebsocketConnectionService } from './websocket-connection.service';
export declare class WebsocketMessagingService {
    private readonly redis;
    private readonly connectionService;
    private readonly logger;
    private server;
    constructor(redis: RedisService, connectionService: WebsocketConnectionService);
    setServer(server: Server): void;
    sendToUser(userId: string, event: string, data: any): Promise<boolean>;
    sendToMaster(masterId: string, event: string, data: any): void;
    sendToAdmins(event: string, data: any): void;
    sendToAll(event: string, data: any): void;
    saveOfflineNotification(userId: string, event: string, data: unknown): Promise<void>;
    getOfflineNotifications(userId: string): Promise<Record<string, unknown>[]>;
}
