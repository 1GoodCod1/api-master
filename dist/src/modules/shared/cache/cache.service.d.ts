import { RedisService } from '../redis/redis.service';
export interface CacheOptions {
    ttl?: number;
    prefix?: string;
}
export declare class CacheService {
    private readonly redis;
    private readonly logger;
    private readonly defaultTTL;
    constructor(redis: RedisService);
    get<T = any>(key: string): Promise<T | null>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    delByPattern(pattern: string): Promise<number>;
    private isRetryableConnectionError;
    getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T>;
    invalidate(pattern: string): Promise<number>;
    exists(key: string): Promise<boolean>;
    getTTL(key: string): Promise<number>;
    incr(key: string, ttl?: number): Promise<number>;
    buildKey(parts: (string | number | null | undefined)[], prefix?: string): string;
    keys: {
        searchMasters: (params: {
            categoryId?: string | null;
            cityId?: string | null;
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: string;
            search?: string | null;
            tariffType?: string | null;
            minRating?: number | null;
            isFeatured?: boolean | null;
            minPrice?: number | null;
            maxPrice?: number | null;
            availableNow?: boolean | null;
            hasPromotion?: boolean | null;
        }) => string;
        masterFull: (idOrSlug: string) => string;
        masterStats: (id: string) => string;
        masterReviews: (id: string, page: number, limit: number, status?: string) => string;
        categoriesAll: () => string;
        categoryWithStats: (id: string) => string;
        citiesAll: () => string;
        cityWithStats: (id: string) => string;
        tariffsAll: () => string;
        tariffById: (id: string) => string;
        tariffByType: (type: string) => string;
        masterLeads: (masterId: string, status: string | null, page: number) => string;
        userProfile: (id: string) => string;
        userMasterProfile: (id: string) => string;
        analytics: (masterId: string, period: string, type: string) => string;
        topMasters: (categoryId: string | null, cityId: string | null, limit: number) => string;
        popularMasters: (limit: number) => string;
        newMasters: (limit: number) => string;
        searchFilters: () => string;
    };
    ttl: {
        search: number;
        masterProfile: number;
        masterStats: number;
        reviews: number;
        categories: number;
        cities: number;
        tariffs: number;
        leads: number;
        userProfile: number;
        analyticsDay: number;
        analyticsWeek: number;
        analyticsMonth: number;
        topMasters: number;
        popularMasters: number;
        newMasters: number;
        searchFilters: number;
        landingStats: number;
        notifications: number;
    };
}
