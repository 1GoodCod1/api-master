import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
export declare class AdminUsersService {
    private readonly prisma;
    private readonly cache;
    constructor(prisma: PrismaService, cache: CacheService);
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
                lifetimePremium: boolean;
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
    getRecentUsers(limit?: number): Promise<{
        id: string;
        email: string;
        phone: string;
        role: import("@prisma/client").$Enums.UserRole;
        isVerified: boolean;
        createdAt: Date;
    }[]>;
}
