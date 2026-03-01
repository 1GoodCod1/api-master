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
var RecommendationsListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationsListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const recommendations_service_1 = require("../recommendations.service");
const activity_events_1 = require("../events/activity.events");
let RecommendationsListener = RecommendationsListener_1 = class RecommendationsListener {
    recommendationsService;
    logger = new common_1.Logger(RecommendationsListener_1.name);
    constructor(recommendationsService) {
        this.recommendationsService = recommendationsService;
    }
    async handleActivityTracked(payload) {
        try {
            await this.recommendationsService.trackActivity(payload);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Ошибка при обработке события активности: ${msg}`);
        }
    }
};
exports.RecommendationsListener = RecommendationsListener;
__decorate([
    (0, event_emitter_1.OnEvent)(activity_events_1.ActivityEvent.TRACKED, { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RecommendationsListener.prototype, "handleActivityTracked", null);
exports.RecommendationsListener = RecommendationsListener = RecommendationsListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [recommendations_service_1.RecommendationsService])
], RecommendationsListener);
//# sourceMappingURL=recommendations.listener.js.map