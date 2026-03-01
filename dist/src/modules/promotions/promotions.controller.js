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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const promotions_service_1 = require("./promotions.service");
const create_promotion_dto_1 = require("./dto/create-promotion.dto");
const update_promotion_dto_1 = require("./dto/update-promotion.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const verified_guard_1 = require("../../common/guards/verified.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const verified_decorator_1 = require("../../common/decorators/verified.decorator");
let PromotionsController = class PromotionsController {
    promotionsService;
    constructor(promotionsService) {
        this.promotionsService = promotionsService;
    }
    async getActivePromotions(limit) {
        return this.promotionsService.findActivePromotions(limit ? parseInt(limit, 10) : 10);
    }
    async getActivePromotionsForMaster(masterId) {
        return this.promotionsService.findActivePromotionsForMaster(masterId);
    }
    async getMyPromotions(req) {
        const masterId = req.user.masterProfile?.id;
        if (!masterId)
            throw new common_1.BadRequestException('Master profile not found');
        return this.promotionsService.findMyPromotions(masterId);
    }
    async create(dto, req) {
        const masterId = req.user.masterProfile?.id;
        if (!masterId)
            throw new common_1.BadRequestException('Master profile not found');
        return this.promotionsService.create(masterId, dto);
    }
    async update(id, dto, req) {
        const masterId = req.user.masterProfile?.id;
        if (!masterId)
            throw new common_1.BadRequestException('Master profile not found');
        return this.promotionsService.update(id, masterId, dto);
    }
    async remove(id, req) {
        const masterId = req.user.masterProfile?.id;
        if (!masterId)
            throw new common_1.BadRequestException('Master profile not found');
        return this.promotionsService.remove(id, masterId);
    }
};
exports.PromotionsController = PromotionsController;
__decorate([
    (0, common_1.Get)('active'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all active promotions (public)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PromotionsController.prototype, "getActivePromotions", null);
__decorate([
    (0, common_1.Get)('master/:masterId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all active promotions for a specific master' }),
    __param(0, (0, common_1.Param)('masterId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PromotionsController.prototype, "getActivePromotionsForMaster", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, verified_guard_1.VerifiedGuard),
    (0, roles_decorator_1.Roles)('MASTER'),
    (0, verified_decorator_1.Verified)(true),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my promotions' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PromotionsController.prototype, "getMyPromotions", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, verified_guard_1.VerifiedGuard),
    (0, roles_decorator_1.Roles)('MASTER'),
    (0, verified_decorator_1.Verified)(true),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a promotion' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_promotion_dto_1.CreatePromotionDto, Object]),
    __metadata("design:returntype", Promise)
], PromotionsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, verified_guard_1.VerifiedGuard),
    (0, roles_decorator_1.Roles)('MASTER'),
    (0, verified_decorator_1.Verified)(true),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update a promotion' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_promotion_dto_1.UpdatePromotionDto, Object]),
    __metadata("design:returntype", Promise)
], PromotionsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, verified_guard_1.VerifiedGuard),
    (0, roles_decorator_1.Roles)('MASTER'),
    (0, verified_decorator_1.Verified)(true),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a promotion' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PromotionsController.prototype, "remove", null);
exports.PromotionsController = PromotionsController = __decorate([
    (0, swagger_1.ApiTags)('Promotions'),
    (0, common_1.Controller)('promotions'),
    __metadata("design:paramtypes", [promotions_service_1.PromotionsService])
], PromotionsController);
//# sourceMappingURL=promotions.controller.js.map