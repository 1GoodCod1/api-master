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
exports.AdminAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
let AdminAnalyticsService = class AdminAnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAnalytics(timeframe = 'day') {
        const now = new Date();
        let startDate;
        switch (timeframe) {
            case 'day':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 1);
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 1);
                break;
        }
        const [databaseStats, newUsersInPeriod, newLeadsInPeriod, newReviewsInPeriod, revenueInPeriod, usersByDay, leadsByDay, reviewsByDay, revenueByDay, categoryStats, cityStats,] = await Promise.all([
            Promise.all([
                this.prisma.user.count(),
                this.prisma.master.count(),
                this.prisma.lead.count(),
                this.prisma.review.count(),
                this.prisma.payment.count(),
            ]).then(([totalUsers, totalMasters, totalLeads, totalReviews, totalPayments,]) => ({
                totalUsers,
                totalMasters,
                totalLeads,
                totalReviews,
                totalPayments,
            })),
            this.prisma.user.count({
                where: { createdAt: { gte: startDate } },
            }),
            this.prisma.lead.count({
                where: { createdAt: { gte: startDate } },
            }),
            this.prisma.review.count({
                where: { createdAt: { gte: startDate } },
            }),
            this.prisma.payment
                .aggregate({
                where: {
                    createdAt: { gte: startDate },
                    status: constants_1.PaymentStatus.SUCCESS,
                },
                _sum: { amount: true },
            })
                .then((result) => Number(result._sum.amount) || 0),
            this.getDailyStats('User', startDate),
            this.getDailyStats('Lead', startDate),
            this.getDailyStats('Review', startDate),
            this.getDailyRevenueStats(startDate),
            this.getCategoryStats(),
            this.getCityStats(),
        ]);
        return {
            timeframe,
            stats: {
                database: databaseStats,
                daily: {
                    newUsers: newUsersInPeriod,
                    newLeads: newLeadsInPeriod,
                    newReviews: newReviewsInPeriod,
                    revenue: revenueInPeriod,
                },
            },
            users: usersByDay,
            leads: leadsByDay,
            reviews: reviewsByDay,
            revenue: revenueByDay,
            categories: categoryStats,
            cities: cityStats,
        };
    }
    async getDailyStats(model, startDate) {
        const days = Math.ceil((Date.now() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        const stats = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            let count = 0;
            switch (model) {
                case 'User':
                    count = await this.prisma.user.count({
                        where: { createdAt: { gte: date, lt: nextDate } },
                    });
                    break;
                case 'Lead':
                    count = await this.prisma.lead.count({
                        where: { createdAt: { gte: date, lt: nextDate } },
                    });
                    break;
                case 'Review':
                    count = await this.prisma.review.count({
                        where: { createdAt: { gte: date, lt: nextDate } },
                    });
                    break;
            }
            stats.push({
                date: date.toISOString().split('T')[0],
                count,
            });
        }
        return stats;
    }
    async getDailyRevenueStats(startDate) {
        const days = Math.ceil((Date.now() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        const stats = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const revenue = await this.prisma.payment.aggregate({
                where: {
                    createdAt: { gte: date, lt: nextDate },
                    status: constants_1.PaymentStatus.SUCCESS,
                },
                _sum: { amount: true },
            });
            stats.push({
                date: date.toISOString().split('T')[0],
                revenue: Number(revenue._sum.amount) || 0,
            });
        }
        return stats;
    }
    async getCategoryStats() {
        return this.prisma.category.findMany({
            include: {
                _count: {
                    select: { masters: true },
                },
                masters: {
                    select: {
                        rating: true,
                        leadsCount: true,
                    },
                },
            },
            orderBy: {
                masters: {
                    _count: 'desc',
                },
            },
            take: 10,
        });
    }
    async getCityStats() {
        return this.prisma.city.findMany({
            include: {
                _count: {
                    select: { masters: true },
                },
                masters: {
                    select: {
                        rating: true,
                        leadsCount: true,
                    },
                },
            },
            orderBy: {
                masters: {
                    _count: 'desc',
                },
            },
            take: 10,
        });
    }
};
exports.AdminAnalyticsService = AdminAnalyticsService;
exports.AdminAnalyticsService = AdminAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminAnalyticsService);
//# sourceMappingURL=admin-analytics.service.js.map