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
var TariffsQueryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TariffsQueryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
let TariffsQueryService = TariffsQueryService_1 = class TariffsQueryService {
    prisma;
    cache;
    logger = new common_1.Logger(TariffsQueryService_1.name);
    constructor(prisma, cache) {
        this.prisma = prisma;
        this.cache = cache;
    }
    async findAll(filters = {}) {
        const filterKey = JSON.stringify(filters);
        const cacheKey = this.cache.buildKey([
            'cache',
            'tariffs',
            'all',
            filterKey,
        ]);
        const cached = await this.cache.getOrSet(cacheKey, async () => {
            const where = {};
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            return this.prisma.tariff.findMany({
                where,
                orderBy: { sortOrder: 'asc' },
            });
        }, this.cache.ttl.tariffs);
        if (Array.isArray(cached) && cached.length === 0) {
            const where = {};
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            const count = await this.prisma.tariff.count({ where });
            if (count > 0) {
                this.logger.warn(`Tariffs cache was stale (empty). DB has ${count} tariffs. Invalidating cache.`);
                await this.cache.del(cacheKey);
                await this.cache.invalidate('cache:tariffs:all:*');
                return this.prisma.tariff.findMany({
                    where,
                    orderBy: { sortOrder: 'asc' },
                });
            }
        }
        return cached;
    }
    async findOne(id) {
        const cacheKey = this.cache.keys.tariffById(id);
        return this.cache.getOrSet(cacheKey, async () => {
            const tariff = await this.prisma.tariff.findUnique({ where: { id } });
            if (!tariff)
                throw new common_1.NotFoundException('Тариф не найден');
            return tariff;
        }, this.cache.ttl.tariffs);
    }
    async findByType(type) {
        const cacheKey = this.cache.keys.tariffByType(type);
        return this.cache.getOrSet(cacheKey, async () => {
            const tariff = await this.prisma.tariff.findUnique({ where: { type } });
            if (!tariff)
                throw new common_1.NotFoundException(`Тариф с типом ${type} не найден`);
            return tariff;
        }, this.cache.ttl.tariffs);
    }
    async getActiveTariffs() {
        return this.findAll({ isActive: true });
    }
};
exports.TariffsQueryService = TariffsQueryService;
exports.TariffsQueryService = TariffsQueryService = TariffsQueryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], TariffsQueryService);
//# sourceMappingURL=tariffs-query.service.js.map