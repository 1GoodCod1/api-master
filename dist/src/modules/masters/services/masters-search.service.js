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
var MastersSearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastersSearchService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
const plans_1 = require("../../../common/helpers/plans");
const masters_search_sql_service_1 = require("./masters-search-sql.service");
let MastersSearchService = MastersSearchService_1 = class MastersSearchService {
    prisma;
    cache;
    sqlService;
    logger = new common_1.Logger(MastersSearchService_1.name);
    constructor(prisma, cache, sqlService) {
        this.prisma = prisma;
        this.cache = cache;
        this.sqlService = sqlService;
    }
    static isUuid(s) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    }
    async findAll(searchDto) {
        const { categoryId: rawCategoryId, cityId: rawCityId, tariffType, isFeatured, minRating, minPrice, maxPrice, availableNow, hasPromotion, search, cursor, page = 1, limit = 20, sortBy = 'rating', sortOrder = 'desc', } = searchDto;
        let categoryId = rawCategoryId;
        let cityId = rawCityId;
        if (rawCategoryId && !MastersSearchService_1.isUuid(rawCategoryId)) {
            const cat = await this.prisma.category.findFirst({
                where: {
                    slug: { equals: rawCategoryId, mode: 'insensitive' },
                    isActive: true,
                },
                select: { id: true },
            });
            categoryId = cat?.id;
        }
        if (rawCityId && !MastersSearchService_1.isUuid(rawCityId)) {
            const city = await this.prisma.city.findFirst({
                where: {
                    slug: { equals: rawCityId, mode: 'insensitive' },
                    isActive: true,
                },
                select: { id: true },
            });
            cityId = city?.id;
        }
        const take = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = cursor !== undefined && cursor !== null
            ? Math.max(0, Number(cursor) || 0)
            : (Math.max(1, Number(page) || 1) - 1) * take;
        const effectivePage = Math.floor(skip / Math.max(1, take)) + 1;
        const cacheKey = this.cache.keys.searchMasters({
            categoryId: categoryId || null,
            cityId: cityId || null,
            page: effectivePage,
            limit: take,
            sortBy,
            sortOrder,
            search: search || null,
            tariffType: tariffType || null,
            minRating: minRating || null,
            isFeatured: isFeatured !== undefined ? isFeatured : null,
            minPrice: minPrice ?? null,
            maxPrice: maxPrice ?? null,
            availableNow: availableNow ?? null,
            hasPromotion: hasPromotion ?? null,
        });
        return this.cache.getOrSet(cacheKey, async () => {
            const now = new Date();
            const where = {
                user: { isBanned: false },
            };
            if (categoryId)
                where.categoryId = categoryId;
            if (cityId)
                where.cityId = cityId;
            if (isFeatured !== undefined)
                where.isFeatured = isFeatured;
            if (minRating !== undefined)
                where.rating = { gte: Number(minRating) };
            if (availableNow === true) {
                where.isOnline = true;
                where.availabilityStatus = 'AVAILABLE';
            }
            if (hasPromotion === true) {
                where.promotions = {
                    some: {
                        isActive: true,
                        validFrom: { lte: now },
                        validUntil: { gte: now },
                    },
                };
            }
            if (search && search.trim()) {
                const searchTerm = search.trim();
                where.OR = [
                    {
                        user: {
                            firstName: { contains: searchTerm, mode: 'insensitive' },
                        },
                    },
                    {
                        user: {
                            lastName: { contains: searchTerm, mode: 'insensitive' },
                        },
                    },
                    { description: { contains: searchTerm, mode: 'insensitive' } },
                    { slug: { contains: searchTerm, mode: 'insensitive' } },
                ];
            }
            if (tariffType) {
                where.tariffType = tariffType;
                if (tariffType !== 'BASIC')
                    where.tariffExpiresAt = { gt: now };
            }
            const total = await this.prisma.master.count({ where });
            const ids = await this.sqlService.getRankedMasterIds({
                categoryId,
                cityId,
                tariffType,
                isFeatured,
                minRating,
                minPrice,
                maxPrice,
                availableNow,
                hasPromotion,
                search,
                skip,
                take,
                sortBy,
                sortOrder,
            });
            if (!ids.length) {
                return {
                    items: [],
                    meta: {
                        total,
                        page,
                        limit: take,
                        totalPages: Math.ceil(total / take),
                    },
                };
            }
            const masters = await this.prisma.master.findMany({
                where: { id: { in: ids } },
                include: {
                    avatarFile: true,
                    category: true,
                    city: true,
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            isVerified: true,
                        },
                    },
                    _count: {
                        select: { reviews: { where: { status: constants_1.ReviewStatus.VISIBLE } } },
                    },
                },
            });
            const byId = new Map(masters.map((m) => [m.id, m]));
            const ordered = ids
                .map((id) => byId.get(id))
                .filter((m) => m != null);
            const nextCursor = skip + take < total ? skip + take : null;
            return {
                items: ordered.map((master) => {
                    const sanitized = (0, plans_1.sanitizePublicMaster)(master);
                    const eff = (0, plans_1.getEffectiveTariff)(sanitized);
                    const avatarFile = master.avatarFile;
                    return {
                        ...sanitized,
                        effectiveTariffType: eff,
                        tariffType: eff,
                        avatarUrl: avatarFile?.path ?? null,
                        latitude: master.latitude ?? null,
                        longitude: master.longitude ?? null,
                        services: master.services ?? null,
                    };
                }),
                meta: {
                    total,
                    page: effectivePage,
                    limit: take,
                    totalPages: Math.ceil(total / take),
                    nextCursor,
                },
            };
        }, this.cache.ttl.search);
    }
    async getSearchFilters() {
        const cacheKey = this.cache.keys.searchFilters();
        return this.cache.getOrSet(cacheKey, async () => {
            const now = new Date();
            const [categories, cities, tariffStats, ratingStats, priceRangeRaw] = await Promise.all([
                this.prisma.category.findMany({
                    where: { isActive: true },
                    include: {
                        _count: {
                            select: { masters: true },
                        },
                    },
                    orderBy: { sortOrder: 'asc' },
                }),
                this.prisma.city.findMany({
                    where: { isActive: true },
                    include: {
                        _count: {
                            select: { masters: true },
                        },
                    },
                    orderBy: { name: 'asc' },
                }),
                this.prisma.master.groupBy({
                    by: ['tariffType'],
                    _count: true,
                    where: {
                        user: {
                            isBanned: false,
                            isVerified: true,
                        },
                    },
                }),
                this.prisma.master.aggregate({
                    where: {
                        user: {
                            isBanned: false,
                            isVerified: true,
                        },
                    },
                    _min: { rating: true },
                    _max: { rating: true },
                    _avg: { rating: true },
                }),
                this.getPriceRangeFromServices(now),
            ]);
            const priceRange = priceRangeRaw ?? { min: 0, max: 5000 };
            return {
                categories: categories.map((cat) => ({
                    id: cat.id,
                    slug: cat.slug,
                    name: cat.name,
                    value: cat.slug,
                    count: cat._count.masters,
                    icon: cat.icon,
                })),
                cities: cities.map((city) => ({
                    id: city.id,
                    slug: city.slug,
                    name: city.name,
                    value: city.slug,
                    count: city._count.masters,
                })),
                tariffTypes: tariffStats.map((stat) => ({
                    type: stat.tariffType,
                    count: stat._count,
                })),
                ratingRange: {
                    min: ratingStats._min.rating || 0,
                    max: ratingStats._max.rating || 5,
                    avg: ratingStats._avg.rating || 0,
                },
                experienceRange: {
                    min: 0,
                    max: 50,
                },
                priceRange: {
                    min: Math.max(0, Math.floor(priceRange.min)),
                    max: Math.max(100, Math.ceil(priceRange.max)),
                },
            };
        }, this.cache.ttl.searchFilters);
    }
    async getPriceRangeFromServices(now) {
        try {
            const result = await this.prisma.$queryRaw `
        WITH service_prices AS (
          SELECT
            m.id AS "masterId",
            (s->>'price')::numeric AS price,
            (SELECT pr.discount FROM promotions pr
             WHERE pr."masterId" = m.id AND pr."isActive" = true
               AND pr."validFrom" <= ${now}::timestamptz AND pr."validUntil" >= ${now}::timestamptz
             LIMIT 1) AS discount
          FROM masters m
          CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.services, '[]'::jsonb)) AS s
          INNER JOIN users u ON u.id = m."userId" AND u."isBanned" = false
          WHERE s->>'priceType' = 'FIXED' AND (s->>'price') IS NOT NULL AND (s->>'price') ~ '^[0-9.]+$'
        ),
        effective AS (
          SELECT
            CASE WHEN discount IS NOT NULL THEN ROUND(price * (1 - discount / 100.0)) ELSE price END AS eff
          FROM service_prices
        )
        SELECT MIN(eff)::float8 AS min_val, MAX(eff)::float8 AS max_val FROM effective
      `;
            const row = result?.[0];
            if (!row || row.min_val == null || row.max_val == null)
                return null;
            return { min: Number(row.min_val), max: Number(row.max_val) };
        }
        catch (e) {
            this.logger.warn(`getPriceRangeFromServices failed: ${e instanceof Error ? e.message : e}`);
            return null;
        }
    }
    async getPopularMasters(limit = 10) {
        const cacheKey = this.cache.keys.popularMasters(limit);
        try {
            return await this.cache.getOrSet(cacheKey, async () => {
                const masters = await this.prisma.master.findMany({
                    where: {
                        user: {
                            isBanned: false,
                        },
                        isFeatured: true,
                    },
                    include: {
                        user: {
                            select: { firstName: true, lastName: true, isVerified: true },
                        },
                        avatarFile: true,
                        category: true,
                        city: true,
                        _count: {
                            select: {
                                reviews: {
                                    where: { status: constants_1.ReviewStatus.VISIBLE },
                                },
                            },
                        },
                    },
                    orderBy: [
                        { tariffType: 'desc' },
                        { rating: 'desc' },
                        { leadsCount: 'desc' },
                    ],
                    take: limit,
                });
                return masters.map((m) => {
                    const sanitized = (0, plans_1.sanitizePublicMaster)(m);
                    const avatarFile = m.avatarFile;
                    return {
                        ...sanitized,
                        avatarUrl: avatarFile?.path ?? null,
                    };
                });
            }, this.cache.ttl.popularMasters);
        }
        catch (error) {
            this.logger.warn(`getPopularMasters failed, returning []: ${error instanceof Error ? error.message : error}`);
            return [];
        }
    }
    async getNewMasters(limit = 10) {
        const cacheKey = this.cache.keys.newMasters(limit);
        try {
            return await this.cache.getOrSet(cacheKey, async () => {
                const masters = await this.prisma.master.findMany({
                    where: {
                        user: {
                            isBanned: false,
                        },
                    },
                    include: {
                        user: {
                            select: { firstName: true, lastName: true, isVerified: true },
                        },
                        avatarFile: true,
                        category: true,
                        city: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                });
                return masters.map((m) => {
                    const sanitized = (0, plans_1.sanitizePublicMaster)(m);
                    const avatarFile = m.avatarFile;
                    return {
                        ...sanitized,
                        avatarUrl: avatarFile?.path ?? null,
                    };
                });
            }, this.cache.ttl.newMasters);
        }
        catch (error) {
            this.logger.warn(`getNewMasters failed, returning []: ${error instanceof Error ? error.message : error}`);
            return [];
        }
    }
};
exports.MastersSearchService = MastersSearchService;
exports.MastersSearchService = MastersSearchService = MastersSearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        masters_search_sql_service_1.MastersSearchSqlService])
], MastersSearchService);
//# sourceMappingURL=masters-search.service.js.map