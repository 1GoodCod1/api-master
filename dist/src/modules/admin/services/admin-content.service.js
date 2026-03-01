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
exports.AdminContentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
let AdminContentService = class AdminContentService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLeads(filters) {
        const { status, dateFrom, dateTo, page = 1, limit = 50 } = filters || {};
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom)
                where.createdAt.gte = dateFrom;
            if (dateTo)
                where.createdAt.lte = dateTo;
        }
        const [leads, total] = await Promise.all([
            this.prisma.lead.findMany({
                where,
                include: {
                    master: {
                        select: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    phone: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.lead.count({ where }),
        ]);
        return {
            leads,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getRecentLeads(limit = 10) {
        return this.prisma.lead.findMany({
            include: {
                master: {
                    select: {
                        user: { select: { firstName: true, lastName: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async getReviews(filters) {
        const { status, page = 1, limit = 50 } = filters || {};
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        const [reviews, total] = await Promise.all([
            this.prisma.review.findMany({
                where,
                include: {
                    master: {
                        select: {
                            user: { select: { firstName: true, lastName: true } },
                        },
                    },
                    reviewFiles: {
                        include: {
                            file: {
                                select: {
                                    id: true,
                                    path: true,
                                    filename: true,
                                    mimetype: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.review.count({ where }),
        ]);
        return {
            reviews,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async moderateReview(reviewId, status, reason) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
        });
        if (!review) {
            throw new common_1.NotFoundException('Review not found');
        }
        void reason;
        return this.prisma.review.update({
            where: { id: reviewId },
            data: {
                status: status,
                moderatedBy: 'admin',
                moderatedAt: new Date(),
            },
        });
    }
    async getPayments(filters) {
        const { status, page = 1, limit = 50 } = filters || {};
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        const [payments, total] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                include: {
                    master: {
                        select: {
                            user: { select: { firstName: true, lastName: true } },
                        },
                    },
                    user: {
                        select: {
                            email: true,
                            phone: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.payment.count({ where }),
        ]);
        return {
            payments,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getRecentPayments(limit = 10) {
        return this.prisma.payment.findMany({
            include: {
                master: {
                    select: {
                        user: { select: { firstName: true, lastName: true } },
                    },
                },
                user: {
                    select: {
                        email: true,
                        phone: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async getRecentActivity(limit = 20) {
        return this.prisma.auditLog.findMany({
            include: {
                user: {
                    select: {
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
};
exports.AdminContentService = AdminContentService;
exports.AdminContentService = AdminContentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminContentService);
//# sourceMappingURL=admin-content.service.js.map