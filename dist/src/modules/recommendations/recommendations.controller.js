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
exports.RecommendationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const recommendations_service_1 = require("./recommendations.service");
const optional_jwt_auth_guard_1 = require("../../common/guards/optional-jwt-auth.guard");
const track_activity_dto_1 = require("./dto/track-activity.dto");
let RecommendationsController = class RecommendationsController {
    recommendationsService;
    constructor(recommendationsService) {
        this.recommendationsService = recommendationsService;
    }
    async getPersonalized(req, limit) {
        return this.recommendationsService.getPersonalizedRecommendations(req.user?.id, this.extractSessionId(req), limit ? parseInt(limit) : 10);
    }
    async getSimilar(masterId, limit) {
        return this.recommendationsService.getSimilarMasters(masterId, limit ? parseInt(limit) : 5);
    }
    async getRecentlyViewed(req, limit) {
        return this.recommendationsService.getRecentlyViewed(req.user?.id, this.extractSessionId(req), limit ? parseInt(limit) : 10);
    }
    async trackActivity(dto, req) {
        const forwarded = req.headers['x-forwarded-for'];
        const ipAddress = req.ip ||
            (typeof forwarded === 'string' ? forwarded : forwarded?.[0]) ||
            req.socket?.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const userAgentStr = typeof userAgent === 'string' ? userAgent : userAgent?.[0];
        await this.recommendationsService.trackActivity({
            ...dto,
            userId: req.user?.id,
            sessionId: this.extractSessionId(req),
            ipAddress,
            userAgent: userAgentStr,
        });
        return { success: true };
    }
    extractSessionId(req) {
        const reqWithSession = req;
        const sessionId = reqWithSession.sessionID ?? req.headers['x-session-id'];
        return typeof sessionId === 'string' ? sessionId : sessionId?.[0];
    }
};
exports.RecommendationsController = RecommendationsController;
__decorate([
    (0, common_1.Get)('personalized'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get personalized recommendations' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RecommendationsController.prototype, "getPersonalized", null);
__decorate([
    (0, common_1.Get)('similar/:masterId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get similar masters' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Param)('masterId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RecommendationsController.prototype, "getSimilar", null);
__decorate([
    (0, common_1.Get)('recently-viewed'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get recently viewed masters' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RecommendationsController.prototype, "getRecentlyViewed", null);
__decorate([
    (0, common_1.Post)('track'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Track user activity' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [track_activity_dto_1.TrackActivityDto, Object]),
    __metadata("design:returntype", Promise)
], RecommendationsController.prototype, "trackActivity", null);
exports.RecommendationsController = RecommendationsController = __decorate([
    (0, swagger_1.ApiTags)('Recommendations'),
    (0, common_1.Controller)('recommendations'),
    __metadata("design:paramtypes", [recommendations_service_1.RecommendationsService])
], RecommendationsController);
//# sourceMappingURL=recommendations.controller.js.map