"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationsModule = void 0;
const common_1 = require("@nestjs/common");
const recommendations_service_1 = require("./recommendations.service");
const recommendations_controller_1 = require("./recommendations.controller");
const prisma_module_1 = require("../shared/database/prisma.module");
const redis_module_1 = require("../shared/redis/redis.module");
const recommendations_engine_service_1 = require("./services/recommendations-engine.service");
const recommendations_tracker_service_1 = require("./services/recommendations-tracker.service");
const recommendations_history_service_1 = require("./services/recommendations-history.service");
const recommendations_listener_1 = require("./listeners/recommendations.listener");
let RecommendationsModule = class RecommendationsModule {
};
exports.RecommendationsModule = RecommendationsModule;
exports.RecommendationsModule = RecommendationsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, redis_module_1.RedisModule],
        controllers: [recommendations_controller_1.RecommendationsController],
        providers: [
            recommendations_service_1.RecommendationsService,
            recommendations_engine_service_1.RecommendationsEngineService,
            recommendations_tracker_service_1.RecommendationsTrackerService,
            recommendations_history_service_1.RecommendationsHistoryService,
            recommendations_listener_1.RecommendationsListener,
        ],
        exports: [recommendations_service_1.RecommendationsService],
    })
], RecommendationsModule);
//# sourceMappingURL=recommendations.module.js.map