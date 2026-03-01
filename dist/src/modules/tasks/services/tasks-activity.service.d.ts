import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { NotificationsService } from '../../notifications/notifications.service';
export declare class TasksActivityService {
    private readonly prisma;
    private readonly redis;
    private readonly notifications;
    private readonly logger;
    private readonly INACTIVITY_THRESHOLD_DAYS;
    private readonly WARNING_THRESHOLD_DAYS;
    private readonly RATING_PENALTY;
    constructor(prisma: PrismaService, redis: RedisService, notifications: NotificationsService);
    checkInactiveMasters(): Promise<void>;
    private deactivateInactiveMaster;
    private sendInactivityWarning;
    private sendDeactivationNotification;
    private updateRedisCounters;
    reactivateMaster(masterId: string): Promise<void>;
    getInactivityStats(): Promise<{
        totalInactive: number;
        totalDeactivated: number;
        thresholdDays: number;
        ratingPenalty: number;
    }>;
}
