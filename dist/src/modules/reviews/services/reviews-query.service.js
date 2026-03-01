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
exports.ReviewsQueryService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
const cursor_pagination_1 = require("../../shared/pagination/cursor-pagination");
let ReviewsQueryService = class ReviewsQueryService {
    prisma;
    cache;
    constructor(prisma, cache) {
        this.prisma = prisma;
        this.cache = cache;
    }
    async findAllForMaster(masterId, options = {}) {
        const { status, limit: rawLimit = 20, cursor, page, sortOrder = 'desc', } = options;
        const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));
        const cacheKey = this.cache.keys.masterReviews(masterId, page || 1, limit, status);
        return this.cache.getOrSet(cacheKey, async () => {
            const baseWhere = { masterId };
            if (status)
                baseWhere.status = status;
            const queryParams = (0, cursor_pagination_1.buildCursorQuery)(baseWhere, cursor, page, limit, sortOrder);
            const [rawReviews, total] = await Promise.all([
                this.prisma.review.findMany({
                    where: queryParams.where,
                    orderBy: queryParams.orderBy,
                    take: queryParams.take,
                    skip: queryParams.skip,
                    include: {
                        master: {
                            select: {
                                user: { select: { firstName: true, lastName: true } },
                            },
                        },
                        client: { select: { firstName: true, lastName: true } },
                        reviewCriteria: true,
                        reviewFiles: {
                            include: {
                                file: {
                                    select: {
                                        id: true,
                                        path: true,
                                        mimetype: true,
                                        filename: true,
                                    },
                                },
                            },
                        },
                        replies: true,
                        _count: {
                            select: { votes: true },
                        },
                    },
                }),
                this.prisma.review.count({
                    where: baseWhere,
                }),
            ]);
            return (0, cursor_pagination_1.buildPaginatedResponse)(rawReviews, total, limit, queryParams.usedCursor);
        }, this.cache.ttl.reviews);
    }
    async getStats(masterId) {
        const cacheKey = this.cache.buildKey([
            'cache',
            'master',
            masterId,
            'reviews',
            'stats',
        ]);
        return this.cache.getOrSet(cacheKey, async () => {
            const [statusGroups, ratingStats] = await Promise.all([
                this.prisma.review.groupBy({
                    by: ['status'],
                    where: { masterId },
                    _count: true,
                }),
                this.prisma.review.groupBy({
                    by: ['rating'],
                    where: { masterId, status: constants_1.ReviewStatus.VISIBLE },
                    _count: true,
                }),
            ]);
            const statusMap = {};
            let total = 0;
            for (const g of statusGroups) {
                statusMap[g.status] = g._count;
                total += g._count;
            }
            return {
                total,
                byStatus: {
                    visible: statusMap[constants_1.ReviewStatus.VISIBLE] || 0,
                    pending: statusMap[constants_1.ReviewStatus.PENDING] || 0,
                    hidden: statusMap[constants_1.ReviewStatus.HIDDEN] || 0,
                    reported: statusMap[constants_1.ReviewStatus.REPORTED] || 0,
                },
                ratingDistribution: ratingStats.reduce((acc, curr) => {
                    acc[curr.rating] = curr._count;
                    return acc;
                }, {}),
            };
        }, this.cache.ttl.reviews);
    }
    async canCreateReview(masterId, clientId) {
        const [existingCount, closedLeadCount] = await Promise.all([
            this.prisma.review.count({
                where: { masterId, clientId },
            }),
            this.prisma.lead.count({
                where: { masterId, clientId, status: constants_1.LeadStatus.CLOSED },
            }),
        ]);
        if (existingCount > 0)
            return { canCreate: false, alreadyReviewed: true };
        if (closedLeadCount === 0)
            return { canCreate: false, noClosedLead: true };
        return { canCreate: true };
    }
};
exports.ReviewsQueryService = ReviewsQueryService;
exports.ReviewsQueryService = ReviewsQueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], ReviewsQueryService);
//# sourceMappingURL=reviews-query.service.js.map