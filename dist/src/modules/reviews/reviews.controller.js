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
exports.ReviewsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reviews_service_1 = require("./reviews.service");
const create_review_dto_1 = require("./dto/create-review.dto");
const update_review_status_dto_1 = require("./dto/update-review-status.dto");
const create_review_reply_dto_1 = require("./dto/create-review-reply.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let ReviewsController = class ReviewsController {
    reviewsService;
    constructor(reviewsService) {
        this.reviewsService = reviewsService;
    }
    async canCreate(masterId, req) {
        return this.reviewsService.canCreateReview(masterId, req.user.id);
    }
    async create(createReviewDto, req) {
        return this.reviewsService.create(createReviewDto, req.user.id, req.user);
    }
    async findAllForMaster(masterId, status, limit, cursor, page, sortOrder) {
        return this.reviewsService.findAllForMaster(masterId, {
            status,
            limit: limit ? Math.min(100, Math.max(1, Number(limit) || 20)) : 20,
            cursor,
            page: page ? Number(page) : undefined,
            sortOrder,
        });
    }
    async getStats(masterId, req) {
        const resolvedMasterId = req.user.role === 'ADMIN' ? masterId : req.user.masterProfile?.id;
        if (!resolvedMasterId)
            throw new common_1.ForbiddenException('Master profile not found');
        return this.reviewsService.getStats(resolvedMasterId);
    }
    async updateStatus(id, updateDto, req) {
        const statusEnum = updateDto.status.toUpperCase();
        if (!Object.values(client_1.ReviewStatus).includes(statusEnum)) {
            throw new common_1.BadRequestException(`Invalid status: ${updateDto.status}`);
        }
        return this.reviewsService.updateReviewStatus(id, statusEnum, req.user.id);
    }
    async getMyReviews(req, limit, cursor, page) {
        const masterId = req.user.masterProfile?.id;
        if (!masterId)
            throw new common_1.BadRequestException('Master profile not found');
        return this.reviewsService.findAllForMaster(masterId, {
            status: client_1.ReviewStatus.VISIBLE,
            limit: limit ? Math.min(100, Math.max(1, Number(limit) || 20)) : 20,
            cursor,
            page: page ? Number(page) : undefined,
        });
    }
    async replyToReview(id, dto, req) {
        const masterId = req.user.masterProfile?.id;
        if (!masterId)
            throw new common_1.BadRequestException('Master profile not found');
        return this.reviewsService.replyToReview(id, masterId, dto.content);
    }
    async deleteReply(id, req) {
        const masterId = req.user.masterProfile?.id;
        if (!masterId)
            throw new common_1.BadRequestException('Master profile not found');
        return this.reviewsService.deleteReply(id, masterId);
    }
    async voteHelpful(id, req) {
        return this.reviewsService.voteHelpful(id, req.user.id);
    }
    async removeVote(id, req) {
        return this.reviewsService.removeVote(id, req.user.id);
    }
};
exports.ReviewsController = ReviewsController;
__decorate([
    (0, common_1.Get)('can-create/:masterId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('CLIENT'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Check if client can create a review' }),
    __param(0, (0, common_1.Param)('masterId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "canCreate", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('CLIENT'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create new review' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_review_dto_1.CreateReviewDto, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('master/:masterId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get reviews for master (cursor-paginated)' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: client_1.ReviewStatus }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'cursor', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    __param(0, (0, common_1.Param)('masterId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('cursor')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "findAllForMaster", null);
__decorate([
    (0, common_1.Get)('stats/:masterId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get review statistics' }),
    __param(0, (0, common_1.Param)('masterId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update review status (admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_review_status_dto_1.UpdateReviewStatusDto, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)('my-reviews'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get reviews for authenticated master (cursor-paginated)',
    }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'cursor', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('cursor')),
    __param(3, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "getMyReviews", null);
__decorate([
    (0, common_1.Post)(':id/reply'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Reply to a review (master only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_review_reply_dto_1.CreateReviewReplyDto, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "replyToReview", null);
__decorate([
    (0, common_1.Delete)(':id/reply'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('MASTER'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete reply to a review' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "deleteReply", null);
__decorate([
    (0, common_1.Post)(':id/vote'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('CLIENT'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Vote a review as helpful' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "voteHelpful", null);
__decorate([
    (0, common_1.Delete)(':id/vote'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('CLIENT'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Remove helpful vote' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "removeVote", null);
exports.ReviewsController = ReviewsController = __decorate([
    (0, swagger_1.ApiTags)('Reviews'),
    (0, common_1.Controller)('reviews'),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService])
], ReviewsController);
//# sourceMappingURL=reviews.controller.js.map