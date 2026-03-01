import { OnModuleDestroy } from '@nestjs/common';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export interface SocketData {
    userId?: string;
}
import { RedisService } from '../../shared/redis/redis.service';
import { PrismaService } from '../../shared/database/prisma.service';
export declare class WebsocketConnectionService implements OnModuleDestroy {
    private readonly jwtService;
    private readonly configService;
    private readonly redis;
    private readonly prisma;
    private readonly logger;
    private userConnections;
    constructor(jwtService: JwtService, configService: ConfigService, redis: RedisService, prisma: PrismaService);
    handleConnection(client: Socket): Promise<string | null>;
    handleDisconnect(client: Socket): Promise<{
        userId: string | undefined;
        isLastConnection: boolean;
    }>;
    isUserOnline(userId: string): boolean;
    getOnlineUsers(): Promise<{
        userId: string;
    }[]>;
    private getTokenFromSocket;
    onModuleDestroy(): void;
}
