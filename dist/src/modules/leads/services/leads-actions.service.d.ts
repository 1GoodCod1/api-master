import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { InAppNotificationService } from '../../notifications/services/in-app-notification.service';
import { UpdateLeadStatusDto } from '../dto/update-lead-status.dto';
import { MastersAvailabilityService } from '../../masters/services/masters-availability.service';
export declare class LeadsActionsService {
    private readonly prisma;
    private readonly cache;
    private readonly inAppNotifications;
    private readonly availabilityService;
    constructor(prisma: PrismaService, cache: CacheService, inAppNotifications: InAppNotificationService, availabilityService: MastersAvailabilityService);
    updateStatus(leadId: string, authUser: JwtUser, updateDto: UpdateLeadStatusDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        status: import("@prisma/client").$Enums.LeadStatus;
        clientName: string | null;
        clientPhone: string;
        masterId: string;
        clientId: string | null;
        spamScore: number;
        isPremium: boolean;
    }>;
    notifySubscribersAboutAvailability(masterId: string): Promise<void>;
}
