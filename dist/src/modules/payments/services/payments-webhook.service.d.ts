import { PrismaService } from '../../shared/database/prisma.service';
import { InAppNotificationService } from '../../notifications/services/in-app-notification.service';
import { CacheService } from '../../shared/cache/cache.service';
export declare class PaymentsWebhookService {
    private readonly prisma;
    private readonly inAppNotifications;
    private readonly cache;
    private readonly logger;
    constructor(prisma: PrismaService, inAppNotifications: InAppNotificationService, cache: CacheService);
    completeMiaTariffPayment(orderId: string): Promise<void>;
    private updateMasterTariff;
    private invalidateCachesForTariffChange;
}
