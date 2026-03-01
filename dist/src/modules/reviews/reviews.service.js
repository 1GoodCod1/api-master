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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const reviews_action_service_1 = require("./services/reviews-action.service");
const reviews_query_service_1 = require("./services/reviews-query.service");
let ReviewsService = class ReviewsService {
    actionService;
    queryService;
    constructor(actionService, queryService) {
        this.actionService = actionService;
        this.queryService = queryService;
    }
    async create(createReviewDto, clientId, authUser) {
        return this.actionService.create(createReviewDto, clientId, authUser);
    }
    async findAllForMaster(masterId, options = {}) {
        return this.queryService.findAllForMaster(masterId, options);
    }
    async updateReviewStatus(id, status, moderatedBy) {
        return this.actionService.updateStatus(id, status, moderatedBy);
    }
    async canCreateReview(masterId, clientId) {
        return this.queryService.canCreateReview(masterId, clientId);
    }
    async getStats(masterId) {
        return this.queryService.getStats(masterId);
    }
    async updateMasterRating(masterId) {
        return this.actionService.updateMasterRating(masterId);
    }
    async replyToReview(reviewId, masterId, content) {
        return this.actionService.replyToReview(reviewId, masterId, content);
    }
    async deleteReply(reviewId, masterId) {
        return this.actionService.deleteReply(reviewId, masterId);
    }
    async voteHelpful(reviewId, userId) {
        return this.actionService.voteHelpful(reviewId, userId);
    }
    async removeVote(reviewId, userId) {
        return this.actionService.removeVote(reviewId, userId);
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [reviews_action_service_1.ReviewsActionService,
        reviews_query_service_1.ReviewsQueryService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map