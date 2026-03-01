import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
export declare class UsersQueryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    count(filters?: Prisma.UserWhereInput): Promise<number>;
    findOne(id: string): Promise<{
        masterProfile: ({
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
            services: Prisma.JsonValue | null;
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
        }) | null;
        notifications: {
            id: string;
            createdAt: Date;
            category: import("@prisma/client").$Enums.NotificationCategory | null;
            type: import("@prisma/client").$Enums.NotificationType;
            message: string;
            userId: string | null;
            status: import("@prisma/client").$Enums.NotificationStatus;
            title: string | null;
            metadata: Prisma.JsonValue | null;
            sentAt: Date | null;
            readAt: Date | null;
        }[];
        payments: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            amount: Prisma.Decimal;
            userId: string;
            tariffType: import("@prisma/client").$Enums.TariffType;
            status: import("@prisma/client").$Enums.PaymentStatus;
            expiresAt: Date | null;
            metadata: Prisma.JsonValue | null;
            masterId: string;
            currency: string;
            stripeId: string | null;
            stripeSession: string | null;
            paidAt: Date | null;
        }[];
        id: string;
        email: string;
        phone: string;
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
    getStatistics(): Promise<{
        totalUsers: number;
        byRole: {
            masters: number;
            admins: number;
            guests: number;
        };
        byStatus: {
            verified: number;
            banned: number;
        };
        registrations: {
            today: number;
            week: number;
            month: number;
        };
        activeToday: number;
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
}
