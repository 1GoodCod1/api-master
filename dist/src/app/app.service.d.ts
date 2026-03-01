import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../modules/shared/database/prisma.service';
import { RedisService } from '../modules/shared/redis/redis.service';
interface ServiceStatus {
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    message?: string;
}
interface AppStatus {
    success: boolean;
    code: number;
    message: string;
    timestamp: string;
    version: string;
    environment: string;
    uptime: number;
    services: ServiceStatus[];
}
export declare class AppService {
    private readonly configService;
    private readonly prisma;
    private readonly redis;
    private readonly logger;
    private readonly startTime;
    constructor(configService: ConfigService, prisma: PrismaService, redis: RedisService);
    getStatus(): Promise<AppStatus>;
    getHealth(): Promise<{
        status: string;
        timestamp: string;
    }>;
    getVersion(): {
        version: string;
        build: string;
        name: string;
    };
    private checkServices;
    private checkApi;
    private checkDatabase;
    private checkRedis;
    private checkCache;
}
export {};
