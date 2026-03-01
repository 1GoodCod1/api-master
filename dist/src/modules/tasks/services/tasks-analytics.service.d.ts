import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { NotificationsService } from '../../notifications/notifications.service';
export declare class TasksAnalyticsService {
    private readonly prisma;
    private readonly redis;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService, notifications: NotificationsService);
    aggregateAnalytics(): Promise<void>;
    sendDailyReports(): Promise<void>;
}
