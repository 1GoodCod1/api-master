import type { Server, Socket } from 'socket.io';
import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { ModuleRef } from '@nestjs/core';
import { WebsocketService } from './websocket.service';
import { WebsocketErrorHandlerService } from './services/websocket-error-handler.service';
export declare class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly websocketService;
    private readonly moduleRef;
    private readonly errorHandler;
    server: Server;
    private readonly logger;
    private prisma;
    constructor(websocketService: WebsocketService, moduleRef: ModuleRef, errorHandler: WebsocketErrorHandlerService);
    private getPrismaService;
    afterInit(server: Server): void;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handleSubscribeToMaster(client: Socket, data: {
        masterId: string;
    }): Promise<{
        success: boolean;
        masterId: string;
    }>;
    handleUnsubscribeFromMaster(client: Socket, data: {
        masterId: string;
    }): Promise<{
        success: boolean;
        masterId: string;
    }>;
    handleTyping(client: Socket, data: {
        masterId: string;
        isTyping: boolean;
    }): void;
}
