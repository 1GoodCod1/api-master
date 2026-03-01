import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { SearchMastersDto } from '../dto/search-masters.dto';
import { MastersSearchSqlService } from './masters-search-sql.service';
export declare class MastersSearchService {
    private readonly prisma;
    private readonly cache;
    private readonly sqlService;
    private readonly logger;
    constructor(prisma: PrismaService, cache: CacheService, sqlService: MastersSearchSqlService);
    private static isUuid;
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
    private getPriceRangeFromServices;
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
}
