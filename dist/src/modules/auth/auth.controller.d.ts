import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RefreshCookieService } from './services/refresh-cookie.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
export declare class AuthController {
    private readonly authService;
    private readonly refreshCookie;
    constructor(authService: AuthService, refreshCookie: RefreshCookieService);
    register(registerDto: RegisterDto, res: Response): Promise<Omit<{
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
    }, "refreshToken">>;
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
    login(loginDto: LoginDto, req: Request, res: Response): Promise<Omit<{
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
    }, "refreshToken">>;
    logout(refreshTokenDto: RefreshTokenDto, req: Request, res: Response): Promise<{
        message: string;
    }>;
    refresh(refreshTokenDto: RefreshTokenDto, req: Request, res: Response): Promise<Omit<{
        accessToken: string;
        refreshToken: string;
    }, "refreshToken">>;
    getProfile(user: JwtUser): Promise<{
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
    adminEndpoint(): {
        message: string;
    };
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
