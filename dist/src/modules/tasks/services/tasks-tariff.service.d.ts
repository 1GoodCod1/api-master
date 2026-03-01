import { PrismaService } from '../../shared/database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { InAppNotificationService } from '../../notifications/services/in-app-notification.service';
export declare class TasksTariffService {
    private readonly prisma;
    private readonly notifications;
    private readonly inAppNotifications;
    private readonly logger;
    constructor(prisma: PrismaService, notifications: NotificationsService, inAppNotifications: InAppNotificationService);
    autoBoostMasters(): Promise<void>;
    checkExpiredTariffs(): Promise<void>;
    checkPendingUpgradeTimeouts(): Promise<void>;
    sendTariffExpirationReminders(): Promise<void>;
}
