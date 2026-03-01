import type { RequestWithOptionalUser } from '../../common/decorators/get-user.decorator';
import { RecommendationsService } from './recommendations.service';
import { TrackActivityDto } from './dto/track-activity.dto';
export declare class RecommendationsController {
    private readonly recommendationsService;
    constructor(recommendationsService: RecommendationsService);
    getPersonalized(req: RequestWithOptionalUser, limit?: string): Promise<unknown[]>;
    getSimilar(masterId: string, limit?: string): Promise<({
        user: {
            id: string;
            isVerified: boolean;
        };
        category: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            description: string | null;
            icon: string | null;
            isActive: boolean;
            sortOrder: number;
        };
        city: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            isActive: boolean;
        };
        photos: ({
            file: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                filename: string;
                mimetype: string;
                size: number;
                uploadedById: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            masterId: string;
            fileId: string;
            order: number;
        })[];
    } & {
        id: string;
        avatarFileId: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string | null;
        description: string | null;
        userId: string;
        services: import(".prisma/client/runtime/client").JsonValue | null;
        rating: number;
        totalReviews: number;
        experienceYears: number;
        cityId: string;
        categoryId: string;
        tariffExpiresAt: Date | null;
        tariffCancelAtPeriodEnd: boolean;
        pendingUpgradeTo: import("@prisma/client").$Enums.TariffType | null;
        pendingUpgradeCreatedAt: Date | null;
        isFeatured: boolean;
        views: number;
        leadsCount: number;
        extraPhotosCount: number;
        profileLastEditedAt: Date | null;
        pendingVerification: boolean;
        verificationSubmittedAt: Date | null;
        lifetimePremium: boolean;
        isOnline: boolean;
        lastActivityAt: Date | null;
        isBusy: boolean;
        maxLeadsPerDay: number;
        leadsReceivedToday: number;
        leadsResetAt: Date | null;
        availabilityStatus: import("@prisma/client").$Enums.AvailabilityStatus;
        maxActiveLeads: number;
        currentActiveLeads: number;
        telegramChatId: string | null;
        whatsappPhone: string | null;
        workStartHour: number;
        workEndHour: number;
        autoresponderEnabled: boolean;
        autoresponderMessage: string | null;
        slotDurationMinutes: number;
        latitude: number | null;
        longitude: number | null;
        googleCalendarId: string | null;
        tariffType: import("@prisma/client").$Enums.TariffType;
    })[]>;
    getRecentlyViewed(req: RequestWithOptionalUser, limit?: string): Promise<(({
        user: {
            id: string;
            isVerified: boolean;
        };
        category: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            description: string | null;
            icon: string | null;
            isActive: boolean;
            sortOrder: number;
        };
        city: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            isActive: boolean;
        };
        photos: ({
            file: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                filename: string;
                mimetype: string;
                size: number;
                uploadedById: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            masterId: string;
            fileId: string;
            order: number;
        })[];
    } & {
        id: string;
        avatarFileId: string | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string | null;
        description: string | null;
        userId: string;
        services: import(".prisma/client/runtime/client").JsonValue | null;
        rating: number;
        totalReviews: number;
        experienceYears: number;
        cityId: string;
        categoryId: string;
        tariffExpiresAt: Date | null;
        tariffCancelAtPeriodEnd: boolean;
        pendingUpgradeTo: import("@prisma/client").$Enums.TariffType | null;
        pendingUpgradeCreatedAt: Date | null;
        isFeatured: boolean;
        views: number;
        leadsCount: number;
        extraPhotosCount: number;
        profileLastEditedAt: Date | null;
        pendingVerification: boolean;
        verificationSubmittedAt: Date | null;
        lifetimePremium: boolean;
        isOnline: boolean;
        lastActivityAt: Date | null;
        isBusy: boolean;
        maxLeadsPerDay: number;
        leadsReceivedToday: number;
        leadsResetAt: Date | null;
        availabilityStatus: import("@prisma/client").$Enums.AvailabilityStatus;
        maxActiveLeads: number;
        currentActiveLeads: number;
        telegramChatId: string | null;
        whatsappPhone: string | null;
        workStartHour: number;
        workEndHour: number;
        autoresponderEnabled: boolean;
        autoresponderMessage: string | null;
        slotDurationMinutes: number;
        latitude: number | null;
        longitude: number | null;
        googleCalendarId: string | null;
        tariffType: import("@prisma/client").$Enums.TariffType;
    }) | undefined)[]>;
    trackActivity(dto: TrackActivityDto, req: RequestWithOptionalUser): Promise<{
        success: boolean;
    }>;
    private extractSessionId;
}
