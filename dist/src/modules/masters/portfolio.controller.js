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
exports.PortfolioController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const portfolio_service_1 = require("./services/portfolio.service");
const portfolio_dto_1 = require("./dto/portfolio.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const get_user_decorator_1 = require("../../common/decorators/get-user.decorator");
let PortfolioController = class PortfolioController {
    portfolioService;
    constructor(portfolioService) {
        this.portfolioService = portfolioService;
    }
    async findAll(masterId, serviceTag) {
        return this.portfolioService.findAll(masterId, serviceTag);
    }
    async getServiceTags(masterId) {
        return this.portfolioService.getServiceTags(masterId);
    }
    async findOne(id) {
        return this.portfolioService.findOne(id);
    }
    async create(user, dto) {
        const masterId = user.masterProfile?.id;
        if (!masterId)
            throw new Error('Master profile not found');
        return this.portfolioService.create(masterId, dto);
    }
    async update(id, user, dto) {
        const masterId = user.masterProfile?.id;
        if (!masterId)
            throw new Error('Master profile not found');
        return this.portfolioService.update(id, masterId, dto);
    }
    async reorder(user, dto) {
        const masterId = user.masterProfile?.id;
        if (!masterId)
            throw new Error('Master profile not found');
        return this.portfolioService.reorder(masterId, dto);
    }
    async remove(id, user) {
        const masterId = user.masterProfile?.id;
        if (!masterId)
            throw new Error('Master profile not found');
        return this.portfolioService.remove(id, masterId);
    }
};
exports.PortfolioController = PortfolioController;
__decorate([
    (0, common_1.Get)('master/:masterId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get portfolio items for master (public)' }),
    (0, swagger_1.ApiQuery)({ name: 'serviceTag', required: false }),
    __param(0, (0, common_1.Param)('masterId')),
    __param(1, (0, common_1.Query)('serviceTag')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PortfolioController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('master/:masterId/tags'),
    (0, swagger_1.ApiOperation)({ summary: 'Get unique service tags for master portfolio' }),
    __param(0, (0, common_1.Param)('masterId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PortfolioController.prototype, "getServiceTags", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get single portfolio item' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PortfolioController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create portfolio item (master only)' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, portfolio_dto_1.CreatePortfolioItemDto]),
    __metadata("design:returntype", Promise)
], PortfolioController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update portfolio item' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, portfolio_dto_1.UpdatePortfolioItemDto]),
    __metadata("design:returntype", Promise)
], PortfolioController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)('reorder'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Reorder portfolio items' }),
    __param(0, (0, get_user_decorator_1.GetUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, portfolio_dto_1.ReorderPortfolioDto]),
    __metadata("design:returntype", Promise)
], PortfolioController.prototype, "reorder", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete portfolio item' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, get_user_decorator_1.GetUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PortfolioController.prototype, "remove", null);
exports.PortfolioController = PortfolioController = __decorate([
    (0, swagger_1.ApiTags)('Portfolio'),
    (0, common_1.Controller)('portfolio'),
    __metadata("design:paramtypes", [portfolio_service_1.PortfolioService])
], PortfolioController);
//# sourceMappingURL=portfolio.controller.js.map