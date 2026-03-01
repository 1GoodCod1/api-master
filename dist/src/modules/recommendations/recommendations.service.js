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
var RecommendationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationsService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../shared/redis/redis.service");
const recommendations_engine_service_1 = require("./services/recommendations-engine.service");
const recommendations_tracker_service_1 = require("./services/recommendations-tracker.service");
const recommendations_history_service_1 = require("./services/recommendations-history.service");
let RecommendationsService = RecommendationsService_1 = class RecommendationsService {
    redis;
    engineService;
    trackerService;
    historyService;
    logger = new common_1.Logger(RecommendationsService_1.name);
    CACHE_TTL = 3600;
    constructor(redis, engineService, trackerService, historyService) {
        this.redis = redis;
        this.engineService = engineService;
        this.trackerService = trackerService;
        this.historyService = historyService;
    }
    async getPersonalizedRecommendations(userId, sessionId, limit = 10) {
        const cacheKey = `recommendations:${userId || sessionId || 'anon'}`;
        try {
            const cached = await this.redis.getClient().get(cacheKey);
            if (cached)
                return JSON.parse(cached);
            const recommendations = await this.engineService.calculateScores(userId, sessionId, limit);
            await this.redis
                .getClient()
                .setex(cacheKey, this.CACHE_TTL, JSON.stringify(recommendations));
            return recommendations;
        }
        catch (error) {
            this.logger.error('Error in recommendations:', error);
            return [];
        }
    }
    async getSimilarMasters(masterId, limit = 5) {
        return this.engineService.getSimilarMasters(masterId, limit);
    }
    async getRecentlyViewed(userId, sessionId, limit = 10) {
        return this.historyService.getRecentlyViewed(userId, sessionId, limit);
    }
    async trackActivity(data) {
        try {
            await this.trackerService.trackActivity(data);
            const cacheKey = `recommendations:${data.userId || data.sessionId || 'anon'}`;
            await this.redis.getClient().del(cacheKey);
        }
        catch (error) {
            this.logger.error('Failed to track activity:', error);
        }
    }
};
exports.RecommendationsService = RecommendationsService;
exports.RecommendationsService = RecommendationsService = RecommendationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        recommendations_engine_service_1.RecommendationsEngineService,
        recommendations_tracker_service_1.RecommendationsTrackerService,
        recommendations_history_service_1.RecommendationsHistoryService])
], RecommendationsService);
//# sourceMappingURL=recommendations.service.js.map