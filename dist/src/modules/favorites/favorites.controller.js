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
exports.FavoritesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const favorites_service_1 = require("./favorites.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let FavoritesController = class FavoritesController {
    favoritesService;
    constructor(favoritesService) {
        this.favoritesService = favoritesService;
    }
    async findAll(req) {
        return this.favoritesService.findAll(req.user.id);
    }
    async create(req, masterId) {
        return this.favoritesService.create(req.user.id, masterId);
    }
    async remove(req, masterId) {
        return this.favoritesService.remove(req.user.id, masterId);
    }
    async check(req, masterId) {
        const isFavorite = await this.favoritesService.check(req.user.id, masterId);
        return { isFavorite };
    }
    async count(req) {
        const count = await this.favoritesService.count(req.user.id);
        return { count };
    }
};
exports.FavoritesController = FavoritesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all favorites' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of favorites' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(':masterId'),
    (0, swagger_1.ApiOperation)({ summary: 'Add master to favorites' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Master added to favorites' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Master not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Already in favorites' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('masterId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':masterId'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove master from favorites' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Master removed from favorites' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Favorite not found' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('masterId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('check/:masterId'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if master is in favorites' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Check result' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('masterId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "check", null);
__decorate([
    (0, common_1.Get)('count'),
    (0, swagger_1.ApiOperation)({ summary: 'Get favorites count' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Favorites count' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "count", null);
exports.FavoritesController = FavoritesController = __decorate([
    (0, swagger_1.ApiTags)('Favorites'),
    (0, common_1.Controller)('favorites'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [favorites_service_1.FavoritesService])
], FavoritesController);
//# sourceMappingURL=favorites.controller.js.map