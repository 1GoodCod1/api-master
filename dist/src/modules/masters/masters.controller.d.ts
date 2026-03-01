import { MastersService } from './masters.service';
import { UpdateMasterDto } from './dto/update-master.dto';
import { SearchMastersDto } from './dto/search-masters.dto';
import { SetMasterAvatarDto } from './dto/set-avatar.dto';
import { UpdateOnlineStatusDto } from './dto/update-online-status.dto';
import { UpdateAvailabilityStatusDto } from './dto/update-availability-status.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateScheduleSettingsDto } from './dto/update-schedule-settings.dto';
import { UpdateQuickRepliesDto } from './dto/update-quick-replies.dto';
import { UpdateAutoresponderSettingsDto } from './dto/update-autoresponder-settings.dto';
import { ClaimFreePlanDto } from './dto/claim-free-plan.dto';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import type { RequestWithOptionalUser } from '../../common/decorators/get-user.decorator';
export declare class MastersController {
    private readonly mastersService;
    constructor(mastersService: MastersService);
    findAll(searchDto: SearchMastersDto): Promise<{
        items: never[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            nextCursor?: undefined;
        };
    } | {
        items: {
            effectiveTariffType: "BASIC" | "VIP" | "PREMIUM";
            tariffType: "BASIC" | "VIP" | "PREMIUM";
            avatarUrl: string | null;
            latitude: number | null;
            longitude: number | null;
            services: string | number | boolean | import(".prisma/client/runtime/client").JsonObject | import(".prisma/client/runtime/client").JsonArray | null;
            user?: {
                phone?: string | null;
                email?: string | null;
                [key: string]: unknown;
            };
            tariffExpiresAt?: Date | string | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            nextCursor: number | null;
        };
    }>;
    getFilters(): Promise<{
        categories: {
            id: string;
            slug: string;
            name: string;
            value: string;
            count: number;
            icon: string | null;
        }[];
        cities: {
            id: string;
            slug: string;
            name: string;
            value: string;
            count: number;
        }[];
        tariffTypes: {
            type: import("@prisma/client").$Enums.TariffType;
            count: number;
        }[];
        ratingRange: {
            min: number;
            max: number;
            avg: number;
        };
        experienceRange: {
            min: number;
            max: number;
        };
        priceRange: {
            min: number;
            max: number;
        };
    }>;
    getPopularMasters(limit?: number): Promise<{
        avatarUrl: string | null;
        effectiveTariffType: "BASIC" | "VIP" | "PREMIUM";
        user?: {
            phone?: string | null;
            email?: string | null;
            [key: string]: unknown;
        };
        tariffType?: "BASIC" | "VIP" | "PREMIUM";
        tariffExpiresAt?: Date | string | null;
    }[]>;
    getMasterPhotos(slugOrId: string, limit?: number): Promise<{
        avatarFileId: string | null;
        items: {
            id: string;
        }[];
    }>;
    getNewMasters(limit?: number): Promise<{
        avatarUrl: string | null;
        effectiveTariffType: "BASIC" | "VIP" | "PREMIUM";
        user?: {
            phone?: string | null;
            email?: string | null;
            [key: string]: unknown;
        };
        tariffType?: "BASIC" | "VIP" | "PREMIUM";
        tariffExpiresAt?: Date | string | null;
    }[]>;
    getLandingStats(): Promise<{
        verifiedMastersCount: number;
        verifiedOnlineMastersCount: number;
        completedProjectsCount: number;
        averageRating: number;
        support24_7: true;
    }>;
    getProfile(user: JwtUser): Promise<{
        payments: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            amount: import("@prisma/client-runtime-utils").Decimal;
            userId: string;
            tariffType: import("@prisma/client").$Enums.TariffType;
            status: import("@prisma/client").$Enums.PaymentStatus;
            expiresAt: Date | null;
            metadata: import(".prisma/client/runtime/client").JsonValue | null;
            masterId: string;
            currency: string;
            stripeId: string | null;
            stripeSession: string | null;
            paidAt: Date | null;
        }[];
        user: {
            firstName: string | null;
            lastName: string | null;
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
        analytics: {
            id: string;
            createdAt: Date;
            rating: number;
            leadsCount: number;
            masterId: string;
            date: Date;
            viewsCount: number;
            reviewsCount: number;
            revenue: import("@prisma/client-runtime-utils").Decimal;
        }[];
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
    }>;
    updateProfile(user: JwtUser, updateDto: UpdateMasterDto): Promise<{
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
    }>;
    setAvatar(dto: SetMasterAvatarDto, user: JwtUser): Promise<{
        ok: boolean;
    }>;
    getMyPhotos(user: JwtUser): Promise<{
        avatarFileId: string | null;
        items: {
            path: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            filename: string;
            mimetype: string;
            size: number;
            uploadedById: string | null;
        }[];
    }>;
    removeMyPhoto(fileId: string, user: JwtUser): Promise<{
        ok: boolean;
    }>;
    getTariff(user: JwtUser): Promise<import("./services/masters-tariff.service").GetTariffResult>;
    claimFreePlan(user: JwtUser, dto: ClaimFreePlanDto): Promise<{
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
    }>;
    getStats(user: JwtUser): Promise<{
        leadsToday: number;
        leadsThisWeek: number;
        leadsThisMonth: number;
        viewsToday: number;
        viewsThisWeek: number;
        viewsThisMonth: number;
    }>;
    getViewsHistory(user: JwtUser, period?: 'week' | 'month', limit?: number): Promise<{
        periodStart: string;
        periodEnd: string;
        views: number;
        label: string;
    }[]>;
    updateOnlineStatus(user: JwtUser, dto: UpdateOnlineStatusDto): Promise<{
        success: boolean;
        isOnline: boolean;
        lastActivityAt: Date | null;
    }>;
    updateAvailabilityStatus(user: JwtUser, dto: UpdateAvailabilityStatusDto): Promise<{
        id: string;
        lastActivityAt: Date | null;
        availabilityStatus: import("@prisma/client").$Enums.AvailabilityStatus;
        maxActiveLeads: number;
        currentActiveLeads: number;
        success: boolean;
    }>;
    getAvailabilityStatus(user: JwtUser): Promise<{
        canAcceptLeads: boolean;
        isOnline: boolean;
        lastActivityAt: Date | null;
        availabilityStatus: import("@prisma/client").$Enums.AvailabilityStatus;
        maxActiveLeads: number;
        currentActiveLeads: number;
        success: boolean;
    }>;
    getNotificationSettings(user: JwtUser): Promise<{
        telegramChatId: string | null;
        whatsappPhone: string | null;
    }>;
    updateNotificationSettings(user: JwtUser, dto: UpdateNotificationSettingsDto): Promise<{
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
    }>;
    getScheduleSettings(user: JwtUser): Promise<{
        workStartHour: number;
        workEndHour: number;
        slotDurationMinutes: number;
    }>;
    updateScheduleSettings(user: JwtUser, dto: UpdateScheduleSettingsDto): Promise<{
        workStartHour: number;
        workEndHour: number;
        slotDurationMinutes: number;
        success: boolean;
    }>;
    getMyQuickReplies(user: JwtUser): Promise<{
        items: {
            id: string;
            text: string;
            order: number;
        }[];
    }>;
    replaceMyQuickReplies(user: JwtUser, dto: UpdateQuickRepliesDto): Promise<{
        success: boolean;
        items: {
            id: string;
            text: string;
            order: number;
        }[];
    }>;
    getMyAutoresponderSettings(user: JwtUser): Promise<{
        workStartHour: number;
        workEndHour: number;
        autoresponderEnabled: boolean;
        autoresponderMessage: string | null;
    }>;
    updateMyAutoresponderSettings(user: JwtUser, dto: UpdateAutoresponderSettingsDto): Promise<{
        autoresponderEnabled: boolean;
        autoresponderMessage: string | null;
        success: boolean;
    }>;
    findOne(slugOrId: string, req: RequestWithOptionalUser): Promise<unknown>;
}
