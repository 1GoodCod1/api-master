import { PrismaService } from '../../shared/database/prisma.service';
import { InAppNotificationService } from '../../notifications/services/in-app-notification.service';
export declare class TasksBookingReminderService {
    private readonly prisma;
    private readonly inAppNotifications;
    private readonly logger;
    constructor(prisma: PrismaService, inAppNotifications: InAppNotificationService);
    sendBookingReminders(): Promise<void>;
    private processReminders;
}
