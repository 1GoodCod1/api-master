"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastersModule = void 0;
const common_1 = require("@nestjs/common");
const masters_service_1 = require("./masters.service");
const masters_controller_1 = require("./masters.controller");
const portfolio_controller_1 = require("./portfolio.controller");
const prisma_module_1 = require("../shared/database/prisma.module");
const redis_module_1 = require("../shared/redis/redis.module");
const cache_module_1 = require("../shared/cache/cache.module");
const search_controller_1 = require("./search.controller");
const masters_search_service_1 = require("./services/masters-search.service");
const masters_search_sql_service_1 = require("./services/masters-search-sql.service");
const masters_profile_service_1 = require("./services/masters-profile.service");
const masters_photos_service_1 = require("./services/masters-photos.service");
const masters_stats_service_1 = require("./services/masters-stats.service");
const masters_tariff_service_1 = require("./services/masters-tariff.service");
const portfolio_service_1 = require("./services/portfolio.service");
const masters_availability_service_1 = require("./services/masters-availability.service");
let MastersModule = class MastersModule {
};
exports.MastersModule = MastersModule;
exports.MastersModule = MastersModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, redis_module_1.RedisModule, cache_module_1.CacheModule],
        controllers: [masters_controller_1.MastersController, search_controller_1.SearchController, portfolio_controller_1.PortfolioController],
        providers: [
            masters_service_1.MastersService,
            masters_search_service_1.MastersSearchService,
            masters_search_sql_service_1.MastersSearchSqlService,
            masters_profile_service_1.MastersProfileService,
            masters_photos_service_1.MastersPhotosService,
            masters_stats_service_1.MastersStatsService,
            masters_tariff_service_1.MastersTariffService,
            portfolio_service_1.PortfolioService,
            masters_availability_service_1.MastersAvailabilityService,
        ],
        exports: [masters_service_1.MastersService, masters_availability_service_1.MastersAvailabilityService],
    })
], MastersModule);
//# sourceMappingURL=masters.module.js.map