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
exports.AnalyticsBusinessService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
const decimal_utils_1 = require("../../shared/utils/decimal.utils");
let AnalyticsBusinessService = class AnalyticsBusinessService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBusinessAnalytics(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const [totalMasters, totalUsers, totalLeads, totalReviews, totalRevenue, dailyStats, categoryStats, cityStats,] = await Promise.all([
            this.prisma.master.count({ where: { createdAt: { gte: startDate } } }),
            this.prisma.user.count({ where: { createdAt: { gte: startDate } } }),
            this.prisma.lead.count({ where: { createdAt: { gte: startDate } } }),
            this.prisma.review.count({
                where: { createdAt: { gte: startDate }, status: constants_1.ReviewStatus.VISIBLE },
            }),
            this.prisma.payment.aggregate({
                where: { createdAt: { gte: startDate }, status: constants_1.PaymentStatus.SUCCESS },
                _sum: { amount: true },
            }),
            this.getDailyStats(days),
            this.getCategoryStats(),
            this.getCityStats(),
        ]);
        return {
            period: `${days} days`,
            totals: {
                masters: totalMasters,
                users: totalUsers,
                leads: totalLeads,
                reviews: totalReviews,
                revenue: (0, decimal_utils_1.decimalToNumber)(totalRevenue._sum.amount),
            },
            dailyStats,
            categoryStats,
            cityStats,
        };
    }
    async getDailyStats(days) {
        const stats = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const [leads, reviews, payments] = await Promise.all([
                this.prisma.lead.count({
                    where: { createdAt: { gte: date, lt: nextDate } },
                }),
                this.prisma.review.count({
                    where: {
                        createdAt: { gte: date, lt: nextDate },
                        status: constants_1.ReviewStatus.VISIBLE,
                    },
                }),
                this.prisma.payment.aggregate({
                    where: {
                        createdAt: { gte: date, lt: nextDate },
                        status: constants_1.PaymentStatus.SUCCESS,
                    },
                    _sum: { amount: true },
                }),
            ]);
            stats.push({
                date: date.toISOString().split('T')[0],
                leads,
                reviews,
                revenue: (0, decimal_utils_1.decimalToNumber)(payments._sum.amount),
            });
        }
        return stats;
    }
    async getCategoryStats() {
        const categories = await this.prisma.category.findMany({
            include: {
                _count: { select: { masters: true } },
                masters: { select: { rating: true, leadsCount: true } },
            },
            orderBy: { masters: { _count: 'desc' } },
            take: 10,
        });
        return categories.map((category) => ({
            id: category.id,
            name: category.name,
            mastersCount: category._count.masters,
            avgRating: category.masters.length > 0
                ? category.masters.reduce((sum, m) => sum + (0, decimal_utils_1.decimalToNumber)(m.rating), 0) / category.masters.length
                : 0,
            totalLeads: category.masters.reduce((sum, m) => sum + m.leadsCount, 0),
        }));
    }
    async getCityStats() {
        const cities = await this.prisma.city.findMany({
            include: {
                _count: { select: { masters: true } },
                masters: { select: { rating: true, leadsCount: true } },
            },
            orderBy: { masters: { _count: 'desc' } },
            take: 10,
        });
        return cities.map((city) => ({
            id: city.id,
            name: city.name,
            mastersCount: city._count.masters,
            avgRating: city.masters.length > 0
                ? city.masters.reduce((sum, m) => sum + (0, decimal_utils_1.decimalToNumber)(m.rating), 0) / city.masters.length
                : 0,
            totalLeads: city.masters.reduce((sum, m) => sum + m.leadsCount, 0),
        }));
    }
};
exports.AnalyticsBusinessService = AnalyticsBusinessService;
exports.AnalyticsBusinessService = AnalyticsBusinessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsBusinessService);
//# sourceMappingURL=analytics-business.service.js.map