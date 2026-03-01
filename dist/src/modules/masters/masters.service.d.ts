import type { RequestWithOptionalUser } from '../../common/decorators/get-user.decorator';
import { PrismaService } from '../shared/database/prisma.service';
import { CacheService } from '../shared/cache/cache.service';
import { SearchMastersDto } from './dto/search-masters.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MastersSearchService } from './services/masters-search.service';
import { MastersProfileService } from './services/masters-profile.service';
import { MastersPhotosService } from './services/masters-photos.service';
import { MastersStatsService } from './services/masters-stats.service';
import { MastersTariffService } from './services/masters-tariff.service';
import { UpdateAvailabilityStatusDto } from './dto/update-availability-status.dto';
import { UpdateScheduleSettingsDto } from './dto/update-schedule-settings.dto';
import type { UpdateQuickRepliesDto } from './dto/update-quick-replies.dto';
import type { UpdateAutoresponderSettingsDto } from './dto/update-autoresponder-settings.dto';
export declare class MastersService {
    private readonly prisma;
    private readonly cache;
    private readonly searchService;
    private readonly profileService;
    private readonly photosService;
    private readonly statsService;
    private readonly tariffService;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, cache: CacheService, searchService: MastersSearchService, profileService: MastersProfileService, photosService: MastersPhotosService, statsService: MastersStatsService, tariffService: MastersTariffService, eventEmitter: EventEmitter2);
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
            lifetimePremium?: boolean;
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
    getSearchFilters(): Promise<{
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
        lifetimePremium?: boolean;
        tariffType?: "BASIC" | "VIP" | "PREMIUM";
        tariffExpiresAt?: Date | string | null;
    }[]>;
    getNewMasters(limit?: number): Promise<{
        avatarUrl: string | null;
        effectiveTariffType: "BASIC" | "VIP" | "PREMIUM";
        user?: {
            phone?: string | null;
            email?: string | null;
            [key: string]: unknown;
        };
        lifetimePremium?: boolean;
        tariffType?: "BASIC" | "VIP" | "PREMIUM";
        tariffExpiresAt?: Date | string | null;
    }[]>;
    findOne(slugOrId: string, req: RequestWithOptionalUser, incrementViews?: boolean): Promise<unknown>;
    getProfile(userId: string): Promise<{
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
    updateProfile(userId: string, updateDto: import('./dto/update-master.dto').UpdateMasterDto): Promise<{
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
    getNotificationSettings(userId: string): Promise<{
        telegramChatId: string | null;
        whatsappPhone: string | null;
    }>;
    updateNotificationSettings(userId: string, dto: import('./dto/update-notification-settings.dto').UpdateNotificationSettingsDto): Promise<{
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
    getScheduleSettings(userId: string): Promise<{
        workStartHour: number;
        workEndHour: number;
        slotDurationMinutes: number;
    }>;
    updateScheduleSettings(userId: string, dto: UpdateScheduleSettingsDto): Promise<{
        workStartHour: number;
        workEndHour: number;
        slotDurationMinutes: number;
        success: boolean;
    }>;
    getQuickReplies(userId: string): Promise<{
        items: {
            id: string;
            text: string;
            order: number;
        }[];
    }>;
    replaceQuickReplies(userId: string, dto: UpdateQuickRepliesDto): Promise<{
        success: boolean;
        items: {
            id: string;
            text: string;
            order: number;
        }[];
    }>;
    getAutoresponderSettings(userId: string): Promise<{
        workStartHour: number;
        workEndHour: number;
        autoresponderEnabled: boolean;
        autoresponderMessage: string | null;
    }>;
    updateAutoresponderSettings(userId: string, dto: UpdateAutoresponderSettingsDto): Promise<{
        autoresponderEnabled: boolean;
        autoresponderMessage: string | null;
        success: boolean;
    }>;
    getMasterPhotos(masterIdOrSlug: string, limit?: number): Promise<{
        avatarFileId: string | null;
        items: {
            id: string;
        }[];
    }>;
    getMyPhotos(userId: string): Promise<{
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
    removeMyPhoto(userId: string, fileId: string): Promise<{
        ok: boolean;
    }>;
    setMyAvatar(userId: string, fileId: string): Promise<{
        ok: boolean;
    }>;
    getLandingStats(): Promise<{
        verifiedMastersCount: number;
        verifiedOnlineMastersCount: number;
        completedProjectsCount: number;
        averageRating: number;
        support24_7: true;
    }>;
    getStats(userId: string): Promise<{
        leadsToday: number;
        leadsThisWeek: number;
        leadsThisMonth: number;
        viewsToday: number;
        viewsThisWeek: number;
        viewsThisMonth: number;
    }>;
    getViewsHistory(userId: string, period: 'week' | 'month', limit?: number): Promise<{
        periodStart: string;
        periodEnd: string;
        views: number;
        label: string;
    }[]>;
    updateOnlineStatus(userId: string, isOnline: boolean): Promise<{
        success: boolean;
        isOnline: boolean;
        lastActivityAt: Date | null;
    }>;
    updateAvailabilityStatus(userId: string, dto: UpdateAvailabilityStatusDto): Promise<{
        id: string;
        lastActivityAt: Date | null;
        availabilityStatus: import("@prisma/client").$Enums.AvailabilityStatus;
        maxActiveLeads: number;
        currentActiveLeads: number;
        success: boolean;
    }>;
    getAvailabilityStatus(userId: string): Promise<{
        canAcceptLeads: boolean;
        isOnline: boolean;
        lastActivityAt: Date | null;
        availabilityStatus: import("@prisma/client").$Enums.AvailabilityStatus;
        maxActiveLeads: number;
        currentActiveLeads: number;
        success: boolean;
    }>;
    updateLastActivity(userId: string): Promise<void>;
    getTariff(userId: string): Promise<import("./services/masters-tariff.service").GetTariffResult>;
    updateTariff(masterId: string, tariffTypeStr: string, days: number): Promise<{
        slug: string | null;
        lifetimePremium: boolean;
    }>;
    claimFreePlan(userId: string, tariffType: 'VIP' | 'PREMIUM'): Promise<{
        slug: string | null;
        lifetimePremium: boolean;
    }>;
    private handleViewIncrement;
    private invalidateMasterCache;
}
