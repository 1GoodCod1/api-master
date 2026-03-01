import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { SystemAnalyticsResponse } from '../../shared/types/analytics.types';
export declare class AnalyticsSystemService {
    private readonly prisma;
    private readonly redis;
    constructor(prisma: PrismaService, redis: RedisService);
    getSystemAnalytics(): Promise<SystemAnalyticsResponse>;
    private getActiveUsersCount;
    private getQueueStats;
    private getSystemMetrics;
    private bytesToMB;
}
