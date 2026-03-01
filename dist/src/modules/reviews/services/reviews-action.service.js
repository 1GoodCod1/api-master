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
var ReviewsActionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsActionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
const in_app_notification_service_1 = require("../../notifications/services/in-app-notification.service");
const constants_1 = require("../../../common/constants");
let ReviewsActionService = ReviewsActionService_1 = class ReviewsActionService {
    prisma;
    cache;
    inAppNotifications;
    logger = new common_1.Logger(ReviewsActionService_1.name);
    constructor(prisma, cache, inAppNotifications) {
        this.prisma = prisma;
        this.cache = cache;
        this.inAppNotifications = inAppNotifications;
    }
    async create(createReviewDto, clientId, authUser) {
        const { masterId, rating, criteria, fileIds } = createReviewDto;
        const user = await this.prisma.user.findUnique({ where: { id: clientId } });
        if (!user || !user.phone) {
            throw new common_1.BadRequestException('Пользователь или телефон не найдены. Пожалуйста, заполните профиль.');
        }
        if (authUser?.role === 'CLIENT' && !authUser.phoneVerified) {
            throw new common_1.ForbiddenException('Для написания отзывов необходимо подтвердить номер телефона.');
        }
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
        });
        if (!master)
            throw new common_1.NotFoundException('Мастер не найден');
        const existingReview = await this.prisma.review.findFirst({
            where: { masterId, clientId },
        });
        if (existingReview) {
            throw new common_1.BadRequestException('Вы уже оставили отзыв об этом мастере');
        }
        const closedLead = await this.prisma.lead.findFirst({
            where: { masterId, clientId, status: constants_1.LeadStatus.CLOSED },
        });
        if (!closedLead) {
            throw new common_1.BadRequestException('Отзыв можно оставить только после того, как заказ будет выполнен (статус CLOSED).');
        }
        this.validateCriteria(criteria);
        const safeFileIds = fileIds && fileIds.length ? fileIds.slice(0, 5).filter(Boolean) : [];
        let displayName = createReviewDto.clientName?.trim() ||
            closedLead.clientName?.trim() ||
            null;
        if (!displayName && user) {
            const full = [user.firstName, user.lastName]
                .filter(Boolean)
                .join(' ')
                .trim();
            if (full)
                displayName = full;
        }
        const review = await this.prisma.review.create({
            data: {
                masterId,
                clientId,
                clientPhone: user.phone,
                clientName: displayName,
                rating,
                comment: createReviewDto.comment,
                status: constants_1.ReviewStatus.PENDING,
                reviewCriteria: criteria && criteria.length > 0
                    ? {
                        createMany: {
                            data: criteria.map((c) => ({
                                criteria: c.criteria,
                                rating: c.rating,
                            })),
                        },
                    }
                    : undefined,
                reviewFiles: safeFileIds.length > 0
                    ? { create: safeFileIds.map((fileId) => ({ fileId })) }
                    : undefined,
            },
            include: {
                reviewCriteria: true,
                reviewFiles: {
                    include: {
                        file: {
                            select: { id: true, path: true, mimetype: true, filename: true },
                        },
                    },
                },
            },
        });
        await this.updateMasterRating(masterId);
        await this.invalidateMasterCache(masterId);
        await this.inAppNotifications
            .notifyNewReview(master.userId, {
            reviewId: review.id,
            rating,
            authorName: displayName || undefined,
            masterId,
        })
            .catch((e) => {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(`Failed to send in-app review notification: ${msg}`);
        });
        return review;
    }
    async updateStatus(id, status, moderatedBy) {
        const review = await this.prisma.review.findUnique({ where: { id } });
        if (!review)
            throw new common_1.NotFoundException('Отзыв не найден');
        const updatedReview = await this.prisma.review.update({
            where: { id },
            data: {
                status,
                moderatedBy,
                moderatedAt: new Date(),
            },
        });
        if (status === constants_1.ReviewStatus.VISIBLE) {
            await this.updateMasterRating(review.masterId);
        }
        await this.invalidateMasterCache(review.masterId);
        return updatedReview;
    }
    async updateMasterRating(masterId) {
        const reviews = await this.prisma.review.findMany({
            where: { masterId, status: constants_1.ReviewStatus.VISIBLE },
        });
        if (reviews.length === 0) {
            await this.prisma.master.update({
                where: { id: masterId },
                data: { rating: 0, totalReviews: 0 },
            });
            return;
        }
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await this.prisma.master.update({
            where: { id: masterId },
            data: {
                rating: avgRating,
                totalReviews: reviews.length,
            },
        });
    }
    validateCriteria(criteria) {
        if (!criteria || criteria.length === 0)
            return;
        const validCriteria = ['quality', 'speed', 'price', 'politeness'];
        for (const crit of criteria) {
            if (!validCriteria.includes(crit.criteria)) {
                throw new common_1.BadRequestException(`Некорректный критерий: ${crit.criteria}`);
            }
            if (crit.rating < 1 || crit.rating > 5) {
                throw new common_1.BadRequestException(`Рейтинг критерия ${crit.criteria} должен быть от 1 до 5`);
            }
        }
    }
    async replyToReview(reviewId, masterId, content) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
        });
        if (!review)
            throw new common_1.NotFoundException('Отзыв не найден');
        if (review.masterId !== masterId) {
            throw new common_1.ForbiddenException('Вы не можете ответить на этот отзыв');
        }
        const existingReply = await this.prisma.reviewReply.findUnique({
            where: { reviewId },
        });
        if (existingReply) {
            return this.prisma.reviewReply.update({
                where: { reviewId },
                data: { content },
            });
        }
        return this.prisma.reviewReply.create({
            data: {
                reviewId,
                masterId,
                content,
            },
        });
    }
    async deleteReply(reviewId, masterId) {
        const reply = await this.prisma.reviewReply.findUnique({
            where: { reviewId },
        });
        if (!reply)
            throw new common_1.NotFoundException('Ответ не найден');
        if (reply.masterId !== masterId) {
            throw new common_1.ForbiddenException('Нет доступа');
        }
        await this.prisma.reviewReply.delete({ where: { reviewId } });
        return { deleted: true };
    }
    async voteHelpful(reviewId, userId) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
        });
        if (!review)
            throw new common_1.NotFoundException('Отзыв не найден');
        const existingVote = await this.prisma.reviewVote.findUnique({
            where: { reviewId_userId: { reviewId, userId } },
        });
        if (existingVote) {
            throw new common_1.BadRequestException('Вы уже голосовали за этот отзыв');
        }
        const vote = await this.prisma.reviewVote.create({
            data: { reviewId, userId },
        });
        const votesCount = await this.prisma.reviewVote.count({
            where: { reviewId },
        });
        return { ...vote, votesCount };
    }
    async removeVote(reviewId, userId) {
        const vote = await this.prisma.reviewVote.findUnique({
            where: { reviewId_userId: { reviewId, userId } },
        });
        if (!vote)
            throw new common_1.NotFoundException('Голос не найден');
        await this.prisma.reviewVote.delete({
            where: { reviewId_userId: { reviewId, userId } },
        });
        const votesCount = await this.prisma.reviewVote.count({
            where: { reviewId },
        });
        return { deleted: true, votesCount };
    }
    async invalidateMasterCache(masterId) {
        await this.cache.invalidate(`cache:master:${masterId}:*`);
        await this.cache.del(this.cache.keys.masterStats(masterId));
        await this.cache.invalidate('cache:search:masters:*');
        await this.cache.invalidate('cache:masters:top:*');
        await this.cache.invalidate(`cache:master:${masterId}:reviews:*`);
    }
};
exports.ReviewsActionService = ReviewsActionService;
exports.ReviewsActionService = ReviewsActionService = ReviewsActionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        in_app_notification_service_1.InAppNotificationService])
], ReviewsActionService);
//# sourceMappingURL=reviews-action.service.js.map