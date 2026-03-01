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
var CategoriesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../common/constants");
const prisma_service_1 = require("../shared/database/prisma.service");
const cache_service_1 = require("../shared/cache/cache.service");
const cursor_pagination_1 = require("../shared/pagination/cursor-pagination");
let CategoriesService = CategoriesService_1 = class CategoriesService {
    prisma;
    cache;
    logger = new common_1.Logger(CategoriesService_1.name);
    constructor(prisma, cache) {
        this.prisma = prisma;
        this.cache = cache;
    }
    async findAll(filters = {}) {
        const filterKey = JSON.stringify(filters);
        const cacheKey = this.cache.buildKey([
            'cache',
            'categories',
            'all',
            filterKey,
        ]);
        return this.cache.getOrSet(cacheKey, () => this.prisma.category.findMany({
            where: filters,
            include: {
                _count: {
                    select: { masters: true },
                },
            },
            orderBy: { sortOrder: 'asc' },
        }), this.cache.ttl.categories);
    }
    async findOne(id) {
        const cacheKey = this.cache.keys.categoryWithStats(id);
        const category = await this.cache.getOrSet(cacheKey, async () => {
            const found = await this.prisma.category.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: { masters: true },
                    },
                },
            });
            if (!found) {
                throw new common_1.NotFoundException(`Категория с ID "${id}" не найдена`);
            }
            return found;
        }, this.cache.ttl.categories);
        return category;
    }
    async getMasters(categoryId, options = {}) {
        const { page = 1, limit: rawLimit = 20, cursor } = options;
        const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));
        const baseWhere = {
            categoryId,
            user: {
                isBanned: false,
                isVerified: true,
            },
        };
        const queryParams = (0, cursor_pagination_1.buildCursorQuery)(baseWhere, cursor, page, limit);
        const [category, rawMasters, total] = await Promise.all([
            this.findOne(categoryId),
            this.prisma.master.findMany({
                where: queryParams.where,
                include: {
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
                orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
                take: queryParams.take,
                skip: queryParams.skip,
            }),
            this.prisma.master.count({ where: baseWhere }),
        ]);
        const paginated = (0, cursor_pagination_1.buildPaginatedResponse)(rawMasters, total, limit, queryParams.usedCursor);
        return {
            category,
            masters: paginated.items,
            meta: paginated.meta,
        };
    }
    async create(dto) {
        try {
            const category = await this.prisma.category.create({
                data: dto,
            });
            await this.invalidateGlobalCaches();
            return category;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Ошибка при создании категории: ${message}`);
            throw error;
        }
    }
    async update(id, dto) {
        await this.findOne(id);
        const updated = await this.prisma.category.update({
            where: { id },
            data: dto,
        });
        await this.invalidateCategoryCache(id);
        await this.invalidateGlobalCaches();
        return updated;
    }
    async remove(id) {
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: {
                _count: { select: { masters: true } },
            },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Категория с ID "${id}" не найдена`);
        }
        if (category._count.masters > 0) {
            throw new common_1.BadRequestException('Нельзя удалить категорию, в которой есть активные мастера');
        }
        const deleted = await this.prisma.category.delete({
            where: { id },
        });
        await this.invalidateCategoryCache(id);
        await this.invalidateGlobalCaches();
        return deleted;
    }
    async getStatistics() {
        const cacheKey = this.cache.buildKey(['cache', 'categories', 'statistics']);
        return this.cache.getOrSet(cacheKey, async () => {
            const stats = await this.prisma.$queryRaw `
          SELECT
            c."id" AS "categoryId",
            c."name",
            c."isActive",
            COUNT(m."id")::bigint AS "mastersCount",
            ROUND(AVG(m."rating")::numeric, 1)::float8 AS "avgRating",
            COALESCE(SUM(m."leadsCount"), 0)::bigint AS "totalLeads"
          FROM "categories" c
          LEFT JOIN "masters" m ON m."categoryId" = c."id"
          GROUP BY c."id", c."name", c."isActive"
          ORDER BY COUNT(m."id") DESC
        `;
            return stats.map((row) => ({
                id: row.categoryId,
                name: row.name,
                mastersCount: Number(row.mastersCount),
                isActive: row.isActive,
                avgRating: row.avgRating ?? 0,
                totalLeads: Number(row.totalLeads),
            }));
        }, this.cache.ttl.categories);
    }
    async invalidateCategoryCache(id) {
        await this.cache.del(this.cache.keys.categoryWithStats(id));
    }
    async invalidateGlobalCaches() {
        await Promise.all([
            this.cache.invalidate('cache:categories:all:*'),
            this.cache.invalidate('cache:categories:statistics:*'),
            this.cache.invalidate('cache:search:masters:*'),
            this.cache.del(this.cache.keys.categoriesAll()),
        ]);
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = CategoriesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map