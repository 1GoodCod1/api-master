import { PrismaService } from '../shared/database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CacheService } from '../shared/cache/cache.service';
import { TokenService } from './services/token.service';
import { RegistrationService } from './services/registration.service';
import { PasswordResetService } from './services/password-reset.service';
import { LoginService } from './services/login.service';
export declare class AuthService {
    private readonly prisma;
    private readonly cache;
    private readonly tokenService;
    private readonly registrationService;
    private readonly passwordResetService;
    private readonly loginService;
    private readonly logger;
    constructor(prisma: PrismaService, cache: CacheService, tokenService: TokenService, registrationService: RegistrationService, passwordResetService: PasswordResetService, loginService: LoginService);
    register(registerDto: RegisterDto): Promise<{
        message: string;
        userId: string;
        masterId: string;
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            phone: string;
            role: "MASTER";
            isVerified: boolean;
            masterProfile: {
                id: string;
                firstName: string | null;
                lastName: string | null;
                city: string | undefined;
                category: string | undefined;
            };
        };
    } | {
        user: {
            id: string;
            email: string;
            phone: string;
            role: import("@prisma/client").$Enums.UserRole;
            isVerified: boolean;
            masterProfile?: undefined;
        };
        accessToken: string;
        refreshToken: string;
        message?: undefined;
        userId?: undefined;
        masterId?: undefined;
    }>;
    getRegistrationOptions(): Promise<{
        cities: {
            name: string;
            slug: string;
            value: string;
        }[];
        categories: {
            name: string;
            slug: string;
            icon: string | null;
            value: string;
        }[];
    }>;
    getEarlyBirdStatus(): {
        isActive: boolean;
        remainingSlots: number;
        totalSlots: number;
    };
    login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            phone: string;
            role: import("@prisma/client").$Enums.UserRole;
            isVerified: boolean;
            phoneVerified: boolean;
            masterProfile: {
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
            } | null;
        };
    }>;
    logout(refreshToken: string): Promise<{
        message: string;
    }>;
    validateUser(email: string, password: string): Promise<{
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
    } | null>;
    refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    cleanupExpiredTokens(): Promise<void>;
    getProfile(userId: string): Promise<{
        user: {
            id: string;
            email: string;
            phone: string;
            role: import("@prisma/client").$Enums.UserRole;
            isVerified: boolean;
            isBanned: boolean;
            lastLoginAt: Date | null;
            phoneVerified: boolean;
            createdAt: Date;
            updatedAt: Date;
            masterProfile: {
                id: string;
                avatarFile: {
                    path: string;
                    id: string;
                    filename: string;
                } | null;
                tariffExpiresAt: Date | null;
                tariffType: import("@prisma/client").$Enums.TariffType;
            } | null;
            avatarFile: {
                path: string;
                id: string;
                filename: string;
            } | null;
        };
    }>;
    invalidateUserCache(userId: string): Promise<void>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
