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
var CacheWarmingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheWarmingService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const cache_service_1 = require("../shared/cache/cache.service");
const masters_service_1 = require("../masters/masters.service");
const categories_service_1 = require("../categories/categories.service");
const cities_service_1 = require("../cities/cities.service");
const tariffs_service_1 = require("../tariffs/tariffs.service");
let CacheWarmingService = CacheWarmingService_1 = class CacheWarmingService {
    cache;
    mastersService;
    categoriesService;
    citiesService;
    tariffsService;
    logger = new common_1.Logger(CacheWarmingService_1.name);
    constructor(cache, mastersService, categoriesService, citiesService, tariffsService) {
        this.cache = cache;
        this.mastersService = mastersService;
        this.categoriesService = categoriesService;
        this.citiesService = citiesService;
        this.tariffsService = tariffsService;
    }
    onModuleInit() {
        setImmediate(() => {
            this.logger.log('Starting initial cache warming...');
            void this.warmCriticalCache()
                .then(() => this.logger.log('Initial cache warming completed'))
                .catch((error) => this.logger.error('Failed to warm initial cache', error));
        });
    }
    async warmCriticalCache() {
        await Promise.allSettled([
            this.warmSearchFilters(),
            this.warmPopularMasters(),
            this.warmCategoriesAndCities(),
            this.warmTariffs(),
            this.warmLandingStats(),
        ]);
    }
    async warmCache() {
        this.logger.log('Starting scheduled cache warming...');
        const startTime = Date.now();
        try {
            await Promise.allSettled([
                this.warmPopularMasters(),
                this.warmNewMasters(),
                this.warmSearchFilters(),
                this.warmCategoriesAndCities(),
                this.warmTariffs(),
                this.warmTopMasters(),
                this.warmLandingStats(),
            ]);
            const duration = Date.now() - startTime;
            this.logger.log(`Cache warming completed in ${duration}ms`);
        }
        catch (error) {
            this.logger.error('Cache warming failed', error);
        }
    }
    async warmPopularMasters() {
        try {
            await Promise.all([
                this.mastersService.getPopularMasters(10),
                this.mastersService.getPopularMasters(20),
                this.mastersService.getPopularMasters(50),
            ]);
            this.logger.debug('Popular masters cache warmed');
        }
        catch (error) {
            this.logger.error('Failed to warm popular masters cache', error);
        }
    }
    async warmNewMasters() {
        try {
            await Promise.all([
                this.mastersService.getNewMasters(10),
                this.mastersService.getNewMasters(20),
            ]);
            this.logger.debug('New masters cache warmed');
        }
        catch (error) {
            this.logger.error('Failed to warm new masters cache', error);
        }
    }
    async warmSearchFilters() {
        try {
            await this.mastersService.getSearchFilters();
            this.logger.debug('Search filters cache warmed');
        }
        catch (error) {
            this.logger.error('Failed to warm search filters cache', error);
        }
    }
    async warmCategoriesAndCities() {
        try {
            await Promise.all([
                this.categoriesService.findAll({ isActive: true }),
                this.categoriesService.findAll(),
                this.citiesService.findAll({ isActive: true }),
                this.citiesService.findAll(),
            ]);
            this.logger.debug('Categories and cities cache warmed');
        }
        catch (error) {
            this.logger.error('Failed to warm categories and cities cache', error);
        }
    }
    async warmTariffs() {
        try {
            await Promise.all([
                this.tariffsService.findAll({ isActive: true }),
                this.tariffsService.findAll(),
                this.tariffsService.getActiveTariffs().catch(() => null),
                this.tariffsService.findByType('BASIC').catch(() => null),
                this.tariffsService.findByType('VIP').catch(() => null),
                this.tariffsService.findByType('PREMIUM').catch(() => null),
            ]);
            this.logger.debug('Tariffs cache warmed');
        }
        catch (error) {
            this.logger.error('Failed to warm tariffs cache', error);
        }
    }
    async warmTopMasters() {
        try {
            const [categories, cities] = await Promise.all([
                this.categoriesService.findAll({ isActive: true }),
                this.citiesService.findAll({ isActive: true }),
            ]);
            const topMastersPromises = [];
            for (const category of categories.slice(0, 5)) {
                const dto = {
                    categoryId: category.id,
                    limit: 10,
                    page: 1,
                    sortBy: 'rating',
                    sortOrder: 'desc',
                };
                topMastersPromises.push(this.mastersService.findAll(dto).catch((err) => {
                    this.logger.warn(`Failed to warm top masters for category ${category.id}`, err);
                }));
            }
            for (const city of cities.slice(0, 5)) {
                const dto = {
                    cityId: city.id,
                    limit: 10,
                    page: 1,
                    sortBy: 'rating',
                    sortOrder: 'desc',
                };
                topMastersPromises.push(this.mastersService.findAll(dto).catch((err) => {
                    this.logger.warn(`Failed to warm top masters for city ${city.id}`, err);
                }));
            }
            for (const category of categories.slice(0, 3)) {
                for (const city of cities.slice(0, 3)) {
                    const dto = {
                        categoryId: category.id,
                        cityId: city.id,
                        limit: 10,
                        page: 1,
                        sortBy: 'rating',
                        sortOrder: 'desc',
                    };
                    topMastersPromises.push(this.mastersService.findAll(dto).catch((err) => {
                        this.logger.warn(`Failed to warm top masters for category ${category.id} + city ${city.id}`, err);
                    }));
                }
            }
            await Promise.allSettled(topMastersPromises);
            this.logger.debug('Top masters cache warmed');
        }
        catch (error) {
            this.logger.error('Failed to warm top masters cache', error);
        }
    }
    async warmCacheManual() {
        this.logger.log('Manual cache warming triggered');
        await this.warmCache();
    }
    async warmLandingStats() {
        try {
            await this.mastersService.getLandingStats();
            this.logger.debug('Landing stats cache warmed');
        }
        catch (error) {
            this.logger.error('Failed to warm landing stats cache', error);
        }
    }
};
exports.CacheWarmingService = CacheWarmingService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CacheWarmingService.prototype, "warmCache", null);
exports.CacheWarmingService = CacheWarmingService = CacheWarmingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cache_service_1.CacheService,
        masters_service_1.MastersService,
        categories_service_1.CategoriesService,
        cities_service_1.CitiesService,
        tariffs_service_1.TariffsService])
], CacheWarmingService);
//# sourceMappingURL=cache-warming.service.js.map