import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { NotificationsService } from '../../notifications/notifications.service';
export declare class TasksMaintenanceService {
    private readonly prisma;
    private readonly redis;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService, notifications: NotificationsService);
    cleanOldLeads(): Promise<void>;
    syncRedisCounters(): Promise<void>;
    checkSystemHealth(): Promise<void>;
    updateMasterRatings(): Promise<void>;
    cleanupExpiredTokens(): Promise<void>;
    private getQueueStats;
}
