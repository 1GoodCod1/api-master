import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { InAppNotificationService } from '../../notifications/services/in-app-notification.service';
import { SubmitVerificationDto } from '../dto/submit-verification.dto';
import { ReviewVerificationDto } from '../dto/review-verification.dto';
export declare class VerificationActionService {
    private readonly prisma;
    private readonly cache;
    private readonly inAppNotifications;
    private readonly logger;
    constructor(prisma: PrismaService, cache: CacheService, inAppNotifications: InAppNotificationService);
    submit(userId: string, dto: SubmitVerificationDto): Promise<{
        message: string;
        verificationId: string;
    }>;
    review(verificationId: string, adminId: string, dto: ReviewVerificationDto): Promise<{
        message: string;
    }>;
    private invalidateCache;
}
