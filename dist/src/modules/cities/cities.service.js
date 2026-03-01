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
var CitiesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitiesService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../common/constants");
const prisma_service_1 = require("../shared/database/prisma.service");
const cache_service_1 = require("../shared/cache/cache.service");
let CitiesService = CitiesService_1 = class CitiesService {
    prisma;
    cache;
    logger = new common_1.Logger(CitiesService_1.name);
    constructor(prisma, cache) {
        this.prisma = prisma;
        this.cache = cache;
    }
    async findAll(filters = {}) {
        const filterKey = JSON.stringify(filters);
        const cacheKey = this.cache.buildKey(['cache', 'cities', 'all', filterKey]);
        return this.cache.getOrSet(cacheKey, () => this.prisma.city.findMany({
            where: filters,
            orderBy: { name: 'asc' },
        }), this.cache.ttl.cities);
    }
    async findOne(id) {
        const cacheKey = this.cache.keys.cityWithStats(id);
        const city = await this.cache.getOrSet(cacheKey, async () => {
            const found = await this.prisma.city.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: { masters: true },
                    },
                },
            });
            if (!found) {
                throw new common_1.NotFoundException(`Город с ID "${id}" не найден`);
            }
            return found;
        }, this.cache.ttl.cities);
        return city;
    }
    async getMasters(cityId) {
        const [city, masters] = await Promise.all([
            this.findOne(cityId),
            this.prisma.master.findMany({
                where: {
                    cityId,
                    user: {
                        isBanned: false,
                        isVerified: true,
                    },
                },
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
                orderBy: { rating: 'desc' },
                take: 50,
            }),
        ]);
        return {
            city,
            masters,
            total: masters.length,
        };
    }
    async create(dto) {
        try {
            const city = await this.prisma.city.create({
                data: dto,
            });
            await this.invalidateGlobalCaches();
            return city;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Не удалось создать город: ${message}`);
            throw error;
        }
    }
    async update(id, dto) {
        await this.findOne(id);
        const updated = await this.prisma.city.update({
            where: { id },
            data: dto,
        });
        await this.invalidateCityCache(id);
        await this.invalidateGlobalCaches();
        return updated;
    }
    async remove(id) {
        const city = await this.prisma.city.findUnique({
            where: { id },
            include: {
                _count: { select: { masters: true } },
            },
        });
        if (!city) {
            throw new common_1.NotFoundException(`Город с ID "${id}" не найден`);
        }
        if (city._count.masters > 0) {
            throw new common_1.BadRequestException('Нельзя удалить город, в котором есть активные мастера');
        }
        const deleted = await this.prisma.city.delete({
            where: { id },
        });
        await this.invalidateCityCache(id);
        await this.invalidateGlobalCaches();
        return deleted;
    }
    async getStatistics() {
        const cities = await this.prisma.city.findMany({
            include: {
                _count: {
                    select: { masters: true },
                },
                masters: {
                    select: {
                        rating: true,
                        leadsCount: true,
                    },
                },
            },
            orderBy: {
                masters: {
                    _count: 'desc',
                },
            },
        });
        return cities.map((city) => ({
            id: city.id,
            name: city.name,
            mastersCount: city._count.masters,
            isActive: city.isActive,
            avgRating: this.calculateAverageRating(city.masters),
            totalLeads: city.masters.reduce((sum, m) => sum + m.leadsCount, 0),
        }));
    }
    calculateAverageRating(masters) {
        if (masters.length === 0)
            return 0;
        const total = masters.reduce((sum, m) => sum + m.rating, 0);
        return Math.round((total / masters.length) * 10) / 10;
    }
    async invalidateCityCache(id) {
        await this.cache.del(this.cache.keys.cityWithStats(id));
    }
    async invalidateGlobalCaches() {
        await Promise.all([
            this.cache.invalidate('cache:cities:all:*'),
            this.cache.invalidate('cache:search:masters:*'),
            this.cache.del(this.cache.keys.citiesAll()),
        ]);
    }
};
exports.CitiesService = CitiesService;
exports.CitiesService = CitiesService = CitiesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], CitiesService);
//# sourceMappingURL=cities.service.js.map