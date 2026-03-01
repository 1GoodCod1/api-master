import { AdminUsersService } from './services/admin-users.service';
import { AdminMastersService } from './services/admin-masters.service';
import { AdminLeadsService } from './services/admin-leads.service';
import { AdminReviewsService } from './services/admin-reviews.service';
import { AdminPaymentsService } from './services/admin-payments.service';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import { AdminSystemService, SystemStats } from './services/admin-system.service';
import { TasksActivityService } from '../tasks/services/tasks-activity.service';
import { CacheService } from '../shared/cache/cache.service';
export declare class AdminService {
    private readonly usersService;
    private readonly mastersService;
    private readonly leadsService;
    private readonly reviewsService;
    private readonly paymentsService;
    private readonly auditService;
    private readonly analyticsService;
    private readonly systemService;
    private readonly activityService;
    private readonly cache;
    private readonly logger;
    constructor(usersService: AdminUsersService, mastersService: AdminMastersService, leadsService: AdminLeadsService, reviewsService: AdminReviewsService, paymentsService: AdminPaymentsService, auditService: AdminAuditService, analyticsService: AdminAnalyticsService, systemService: AdminSystemService, activityService: TasksActivityService, cache: CacheService);
    getDashboardData(): Promise<{
        timestamp: string;
        stats: SystemStats;
        recent: {
            users: {
                id: string;
                email: string;
                phone: string;
                role: import("@prisma/client").$Enums.UserRole;
                isVerified: boolean;
                createdAt: Date;
            }[];
            masters: ({
                user: {
                    email: string;
                    phone: string;
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
            })[];
            leads: ({
                master: {
                    user: {
                        firstName: string | null;
                        lastName: string | null;
                    };
                };
            } & {
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
            })[];
            payments: ({
                user: {
                    email: string;
                    phone: string;
                };
                master: {
                    user: {
                        firstName: string | null;
                        lastName: string | null;
                    };
                };
            } & {
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
            })[];
        };
        activity: ({
            user: {
                email: string;
                role: import("@prisma/client").$Enums.UserRole;
            } | null;
        } & {
            id: string;
            ipAddress: string | null;
            createdAt: Date;
            userId: string | null;
            userAgent: string | null;
            action: string;
            entityType: string | null;
            entityId: string | null;
            oldData: import(".prisma/client/runtime/client").JsonValue | null;
            newData: import(".prisma/client/runtime/client").JsonValue | null;
        })[];
    }>;
    getSystemStats(): Promise<SystemStats>;
    getUsers(filters?: {
        role?: string;
        verified?: string | boolean;
        banned?: string | boolean;
        page?: number;
        limit?: number;
        cursor?: string;
    }): Promise<{
        users: {
            id: string;
            email: string;
            phone: string;
            role: import("@prisma/client").$Enums.UserRole;
            isVerified: boolean;
            isBanned: boolean;
            lastLoginAt: Date | null;
            createdAt: Date;
            masterProfile: {
                id: string;
                avatarFile: {
                    path: string;
                    id: string;
                    filename: string;
                } | null;
                category: {
                    name: string;
                };
                city: {
                    name: string;
                };
                rating: number;
                experienceYears: number;
                tariffExpiresAt: Date | null;
                views: number;
                tariffType: import("@prisma/client").$Enums.TariffType;
            } | null;
            avatarFile: {
                path: string;
                id: string;
                filename: string;
            } | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            nextCursor: string | null;
        };
    }>;
    updateUser(userId: string, data: {
        isVerified?: boolean;
        isBanned?: boolean;
        role?: string;
    }): Promise<{
        id: string;
        email: string;
        phone: string;
        password: string;
        firstName: string | null;
        lastName: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        isVerified: boolean;
        isBanned: boolean;
        bannedAt: Date | null;
        bannedReason: string | null;
        avatarFileId: string | null;
        lastLoginAt: Date | null;
        phoneVerified: boolean;
        phoneVerifiedAt: Date | null;
        twoFactorEnabled: boolean;
        twoFactorSecret: string | null;
        suspiciousScore: number;
        warningsCount: number;
        lastWarningAt: Date | null;
        ipAddress: string | null;
        deviceFingerprint: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getMasters(filters?: {
        verified?: boolean;
        featured?: boolean;
        tariff?: string;
        page?: number;
        limit?: number;
        cursor?: string;
    }): Promise<{
        masters: ({
            user: {
                email: string;
                phone: string;
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
            _count: {
                reviews: number;
                leads: number;
            };
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
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            nextCursor: string | null;
        };
    }>;
    updateMaster(masterId: string, data: {
        isFeatured?: boolean;
        tariffType?: string;
    }): Promise<{
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
    getLeads(filters?: {
        status?: string;
        dateFrom?: Date;
        dateTo?: Date;
        page?: number;
        limit?: number;
        cursor?: string;
    }): Promise<{
        leads: ({
            master: {
                user: {
                    phone: string;
                    firstName: string | null;
                    lastName: string | null;
                };
            };
        } & {
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
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            nextCursor: string | null;
        };
    }>;
    getReviews(filters?: {
        status?: string;
        page?: number;
        limit?: number;
        cursor?: string;
    }): Promise<{
        reviews: ({
            master: {
                user: {
                    firstName: string | null;
                    lastName: string | null;
                };
            };
            reviewFiles: ({
                file: {
                    path: string;
                    id: string;
                    filename: string;
                    mimetype: string;
                };
            } & {
                id: string;
                createdAt: Date;
                fileId: string;
                reviewId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            rating: number;
            status: import("@prisma/client").$Enums.ReviewStatus;
            clientName: string | null;
            clientPhone: string;
            comment: string | null;
            masterId: string;
            clientId: string | null;
            moderatedBy: string | null;
            moderatedAt: Date | null;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            nextCursor: string | null;
        };
    }>;
    moderateReview(reviewId: string, status: string, reason?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        status: import("@prisma/client").$Enums.ReviewStatus;
        clientName: string | null;
        clientPhone: string;
        comment: string | null;
        masterId: string;
        clientId: string | null;
        moderatedBy: string | null;
        moderatedAt: Date | null;
    }>;
    getPayments(filters?: {
        status?: string;
        page?: number;
        limit?: number;
        cursor?: string;
    }): Promise<{
        payments: ({
            user: {
                email: string;
                phone: string;
            };
            master: {
                user: {
                    firstName: string | null;
                    lastName: string | null;
                };
            };
        } & {
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
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            nextCursor: string | null;
        };
    }>;
    getAnalytics(timeframe?: 'day' | 'week' | 'month'): Promise<{
        timeframe: "week" | "day" | "month";
        stats: {
            database: {
                totalUsers: number;
                totalMasters: number;
                totalLeads: number;
                totalReviews: number;
                totalPayments: number;
            };
            daily: {
                newUsers: number;
                newLeads: number;
                newReviews: number;
                revenue: number;
            };
        };
        users: {
            date: string;
            count: number;
        }[];
        leads: {
            date: string;
            count: number;
        }[];
        reviews: {
            date: string;
            count: number;
        }[];
        revenue: {
            date: string;
            revenue: number;
        }[];
        categories: ({
            masters: {
                rating: number;
                leadsCount: number;
            }[];
            _count: {
                masters: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            description: string | null;
            icon: string | null;
            isActive: boolean;
            sortOrder: number;
        })[];
        cities: ({
            masters: {
                rating: number;
                leadsCount: number;
            }[];
            _count: {
                masters: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            isActive: boolean;
        })[];
    }>;
    createBackup(): Promise<{
        success: boolean;
        filename: string;
        path: string;
        timestamp: string;
    }>;
    listBackups(): Promise<{
        filename: string;
        size: string;
        modified: Date;
        created: Date;
    }[]>;
    getBackupPath(filename: string): Promise<{
        backupPath: string;
        backupDir: string;
    }>;
    invalidateTariffsCache(): Promise<{
        invalidated: number;
    }>;
    getInactivityStats(): Promise<{
        totalInactive: number;
        totalDeactivated: number;
        thresholdDays: number;
        ratingPenalty: number;
    }>;
}
