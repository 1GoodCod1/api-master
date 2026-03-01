"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
let CacheService = CacheService_1 = class CacheService {
    redis;
    logger = new common_1.Logger(CacheService_1.name);
    defaultTTL = 300;
    constructor(redis) {
        this.redis = redis;
    }
    async get(key) {
        try {
            return await this.redis.get(key);
        }
        catch (error) {
            this.logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttl) {
        try {
            await this.redis.set(key, value, ttl || this.defaultTTL);
        }
        catch (error) {
            this.logger.error(`Cache set error for key ${key}:`, error);
        }
    }
    async del(key) {
        try {
            await this.redis.del(key);
        }
        catch (error) {
            this.logger.error(`Cache del error for key ${key}:`, error);
        }
    }
    async delByPattern(pattern) {
        try {
            const client = this.redis.getClient();
            const keys = [];
            let cursor = '0';
            do {
                const [nextCursor, foundKeys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = nextCursor;
                keys.push(...foundKeys);
            } while (cursor !== '0');
            if (keys.length === 0)
                return 0;
            const batchSize = 100;
            let deleted = 0;
            for (let i = 0; i < keys.length; i += batchSize) {
                const batch = keys.slice(i, i + batchSize);
                await Promise.all(batch.map((key) => this.redis.del(key)));
                deleted += batch.length;
            }
            return deleted;
        }
        catch (error) {
            this.logger.error(`Cache delByPattern error for pattern ${pattern}:`, error);
            return 0;
        }
    }
    isRetryableConnectionError(error) {
        const msg = error instanceof Error ? error.message : String(error);
        return (/connection timeout/i.test(msg) ||
            /connection terminated/i.test(msg) ||
            /ECONNRESET|ECONNREFUSED|ETIMEDOUT/i.test(msg));
    }
    async getOrSet(key, fetchFn, ttl) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        let lastError;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const value = await fetchFn();
                await this.set(key, value, ttl);
                return value;
            }
            catch (error) {
                lastError = error;
                if (attempt === 0 && this.isRetryableConnectionError(error)) {
                    this.logger.warn(`Cache getOrSet retry after connection error: ${error instanceof Error ? error.message : error}`);
                    continue;
                }
                throw error;
            }
        }
        throw lastError;
    }
    async invalidate(pattern) {
        return this.delByPattern(pattern);
    }
    async exists(key) {
        try {
            const client = this.redis.getClient();
            const result = await client.exists(key);
            return result === 1;
        }
        catch (error) {
            this.logger.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }
    async getTTL(key) {
        try {
            const client = this.redis.getClient();
            return await client.ttl(key);
        }
        catch (error) {
            this.logger.error(`Cache getTTL error for key ${key}:`, error);
            return -1;
        }
    }
    async incr(key, ttl) {
        try {
            const value = await this.redis.incr(key);
            if (ttl && value === 1) {
                await this.redis.expire(key, ttl);
            }
            return value;
        }
        catch (error) {
            this.logger.error(`Cache incr error for key ${key}:`, error);
            return 0;
        }
    }
    buildKey(parts, prefix) {
        const filtered = parts.filter((p) => p !== null && p !== undefined);
        const key = filtered.join(':');
        return prefix ? `${prefix}:${key}` : key;
    }
    keys = {
        searchMasters: (params) => {
            return this.buildKey([
                'cache',
                'search',
                'masters',
                params.categoryId || 'null',
                params.cityId || 'null',
                params.page || 1,
                params.limit || 20,
                params.sortBy || 'rating',
                params.sortOrder || 'desc',
                params.search || 'null',
                params.tariffType || 'null',
                params.minRating || 'null',
                params.isFeatured !== undefined && params.isFeatured !== null
                    ? String(params.isFeatured)
                    : 'null',
                params.minPrice != null ? String(params.minPrice) : 'null',
                params.maxPrice != null ? String(params.maxPrice) : 'null',
                params.availableNow != null ? String(params.availableNow) : 'null',
                params.hasPromotion != null ? String(params.hasPromotion) : 'null',
            ]);
        },
        masterFull: (idOrSlug) => this.buildKey(['cache', 'master', idOrSlug, 'full']),
        masterStats: (id) => this.buildKey(['cache', 'master', id, 'stats']),
        masterReviews: (id, page, limit, status) => this.buildKey([
            'cache',
            'master',
            id,
            'reviews',
            status || 'all',
            'page',
            page,
            'limit',
            limit,
        ]),
        categoriesAll: () => this.buildKey(['cache', 'categories', 'all']),
        categoryWithStats: (id) => this.buildKey(['cache', 'category', id, 'with-stats']),
        citiesAll: () => this.buildKey(['cache', 'cities', 'all']),
        cityWithStats: (id) => this.buildKey(['cache', 'city', id, 'with-stats']),
        tariffsAll: () => this.buildKey(['cache', 'tariffs', 'all']),
        tariffById: (id) => this.buildKey(['cache', 'tariff', id]),
        tariffByType: (type) => this.buildKey(['cache', 'tariff', 'type', type]),
        masterLeads: (masterId, status, page) => this.buildKey([
            'cache',
            'master',
            masterId,
            'leads',
            'status',
            status || 'null',
            'page',
            page,
        ]),
        userProfile: (id) => this.buildKey(['cache', 'user', id, 'profile']),
        userMasterProfile: (id) => this.buildKey(['cache', 'user', id, 'master-profile']),
        analytics: (masterId, period, type) => this.buildKey(['cache', 'analytics', 'master', masterId, period, type]),
        topMasters: (categoryId, cityId, limit) => this.buildKey([
            'cache',
            'masters',
            'top',
            categoryId || 'null',
            cityId || 'null',
            limit,
        ]),
        popularMasters: (limit) => this.buildKey(['cache', 'masters', 'popular', limit]),
        newMasters: (limit) => this.buildKey(['cache', 'masters', 'new', limit]),
        searchFilters: () => this.buildKey(['cache', 'masters', 'search-filters', 'v2']),
    };
    ttl = {
        search: 300,
        masterProfile: 600,
        masterStats: 300,
        reviews: 900,
        categories: 3600,
        cities: 7200,
        tariffs: 86400,
        leads: 120,
        userProfile: 900,
        analyticsDay: 600,
        analyticsWeek: 1800,
        analyticsMonth: 3600,
        topMasters: 600,
        popularMasters: 600,
        newMasters: 300,
        searchFilters: 3600,
        landingStats: 600,
        notifications: 60,
    };
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], CacheService);
//# sourceMappingURL=cache.service.js.map