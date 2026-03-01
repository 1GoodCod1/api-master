import { PrismaService } from '../shared/database/prisma.service';
import { CacheService } from '../shared/cache/cache.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { City, Prisma } from '@prisma/client';
export declare class CitiesService {
    private readonly prisma;
    private readonly cache;
    private readonly logger;
    constructor(prisma: PrismaService, cache: CacheService);
    findAll(filters?: Prisma.CityWhereInput): Promise<City[]>;
    findOne(id: string): Promise<City & {
        _count: {
            masters: number;
        };
    }>;
    getMasters(cityId: string): Promise<{
        city: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            isActive: boolean;
        } & {
            _count: {
                masters: number;
            };
        };
        masters: ({
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
        })[];
        total: number;
    }>;
    create(dto: CreateCityDto): Promise<City>;
    update(id: string, dto: UpdateCityDto): Promise<City>;
    remove(id: string): Promise<City>;
    getStatistics(): Promise<{
        id: string;
        name: string;
        mastersCount: number;
        isActive: boolean;
        avgRating: number;
        totalLeads: number;
    }[]>;
    private calculateAverageRating;
    private invalidateCityCache;
    private invalidateGlobalCaches;
}
