"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheWarmingModule = void 0;
const common_1 = require("@nestjs/common");
const cache_warming_service_1 = require("./cache-warming.service");
const cache_warming_controller_1 = require("./cache-warming.controller");
const cache_module_1 = require("../shared/cache/cache.module");
const masters_module_1 = require("../masters/masters.module");
const categories_module_1 = require("../categories/categories.module");
const cities_module_1 = require("../cities/cities.module");
const tariffs_module_1 = require("../tariffs/tariffs.module");
const auth_module_1 = require("../auth/auth.module");
let CacheWarmingModule = class CacheWarmingModule {
};
exports.CacheWarmingModule = CacheWarmingModule;
exports.CacheWarmingModule = CacheWarmingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            cache_module_1.CacheModule,
            masters_module_1.MastersModule,
            categories_module_1.CategoriesModule,
            cities_module_1.CitiesModule,
            tariffs_module_1.TariffsModule,
            auth_module_1.AuthModule,
        ],
        controllers: [cache_warming_controller_1.CacheWarmingController],
        providers: [cache_warming_service_1.CacheWarmingService],
        exports: [cache_warming_service_1.CacheWarmingService],
    })
], CacheWarmingModule);
//# sourceMappingURL=cache-warming.module.js.map