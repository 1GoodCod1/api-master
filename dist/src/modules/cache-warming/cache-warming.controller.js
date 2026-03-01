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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheWarmingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const cache_warming_service_1 = require("./cache-warming.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let CacheWarmingController = class CacheWarmingController {
    cacheWarmingService;
    constructor(cacheWarmingService) {
        this.cacheWarmingService = cacheWarmingService;
    }
    async warmCache() {
        await this.cacheWarmingService.warmCacheManual();
        return { message: 'Cache warming started', success: true };
    }
};
exports.CacheWarmingController = CacheWarmingController;
__decorate([
    (0, common_1.Post)('warm'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger cache warming' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cache warming started' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CacheWarmingController.prototype, "warmCache", null);
exports.CacheWarmingController = CacheWarmingController = __decorate([
    (0, swagger_1.ApiTags)('Cache Warming'),
    (0, common_1.Controller)('cache-warming'),
    __metadata("design:paramtypes", [cache_warming_service_1.CacheWarmingService])
], CacheWarmingController);
//# sourceMappingURL=cache-warming.controller.js.map