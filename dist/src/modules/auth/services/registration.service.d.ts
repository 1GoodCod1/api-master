import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { RegisterDto } from '../dto/register.dto';
import { TokenService } from './token.service';
import { InAppNotificationService } from '../../notifications/services/in-app-notification.service';
export declare class RegistrationService {
    private readonly prisma;
    private readonly tokenService;
    private readonly cache;
    private readonly inAppNotifications;
    constructor(prisma: PrismaService, tokenService: TokenService, cache: CacheService, inAppNotifications: InAppNotificationService);
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
    private validateInput;
    private ensureUserUnique;
    private prepareMasterRequiredData;
    private findCityBySlugOrName;
    private findCategoryBySlugOrName;
    private generateSlug;
    private assembleResponse;
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
}
