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
exports.AnalyticsMasterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const decimal_utils_1 = require("../../shared/utils/decimal.utils");
let AnalyticsMasterService = class AnalyticsMasterService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMasterAnalytics(masterId, days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const analytics = await this.prisma.masterAnalytics.findMany({
            where: {
                masterId,
                date: { gte: startDate },
            },
            orderBy: { date: 'asc' },
        });
        const typedAnalytics = analytics.map((item) => ({
            date: item.date,
            leadsCount: item.leadsCount,
            viewsCount: item.viewsCount,
            reviewsCount: item.reviewsCount,
            rating: (0, decimal_utils_1.decimalToNumber)(item.rating),
            revenue: (0, decimal_utils_1.decimalToNumber)(item.revenue),
        }));
        const filledAnalytics = this.fillMissingDates(typedAnalytics, days);
        return {
            period: `${days} days`,
            data: filledAnalytics.map((item) => ({
                date: item.date.toISOString().split('T')[0],
                leadsCount: item.leadsCount,
                viewsCount: item.viewsCount,
                reviewsCount: item.reviewsCount,
                rating: item.rating,
                revenue: item.revenue,
            })),
            summary: this.calculateSummary(filledAnalytics),
        };
    }
    async getAdvancedMasterAnalytics(masterId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const basicAnalytics = await this.getMasterAnalytics(masterId, days);
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            include: {
                category: true,
                city: true,
            },
        });
        if (!master) {
            throw new Error('Master not found');
        }
        const bookingsCount = await this.prisma.booking.count({
            where: { masterId, createdAt: { gte: startDate } },
        });
        const totalSpent = await this.prisma.payment.aggregate({
            where: { masterId, status: 'SUCCESS' },
            _sum: { amount: true },
        });
        const conversion = this.calculateConversion(basicAnalytics, bookingsCount);
        const trends = this.calculateTrends(basicAnalytics.data);
        const comparison = await this.calculateComparison(masterId, master.categoryId, master.cityId, days);
        const forecast = this.calculateForecast(basicAnalytics.data);
        const peakHours = await this.getPeakHours(masterId, days);
        const heatmap = await this.getActivityHeatmap(masterId, days);
        const topSources = await this.getTopSources(masterId, days);
        const revenue = basicAnalytics.summary.totalRevenue;
        const spent = (0, decimal_utils_1.decimalToNumber)(totalSpent._sum.amount || 0);
        const roi = spent > 0 ? ((revenue - spent) / spent) * 100 : 0;
        return {
            ...basicAnalytics,
            bookingsCount,
            conversion,
            trends,
            comparison,
            forecast,
            peakHours,
            heatmap,
            topSources,
            roi: {
                spent,
                earned: revenue,
                roiPercent: Math.round(roi * 100) / 100,
            },
            insights: this.generateInsights(basicAnalytics, trends, conversion),
        };
    }
    fillMissingDates(analytics, days) {
        const result = [];
        const today = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const existing = analytics.find((a) => a.date.toDateString() === date.toDateString());
            result.push(existing || {
                date,
                leadsCount: 0,
                viewsCount: 0,
                reviewsCount: 0,
                rating: 0,
                revenue: 0,
            });
        }
        return result;
    }
    calculateSummary(analytics) {
        const totalItems = analytics.length;
        const totals = analytics.reduce((acc, item) => ({
            totalLeads: acc.totalLeads + item.leadsCount,
            totalViews: acc.totalViews + item.viewsCount,
            totalReviews: acc.totalReviews + item.reviewsCount,
            totalRating: acc.totalRating + item.rating,
            totalRevenue: acc.totalRevenue + item.revenue,
        }), {
            totalLeads: 0,
            totalViews: 0,
            totalReviews: 0,
            totalRating: 0,
            totalRevenue: 0,
        });
        return {
            totalLeads: totals.totalLeads,
            totalViews: totals.totalViews,
            totalReviews: totals.totalReviews,
            avgRating: totalItems > 0 ? totals.totalRating / totalItems : 0,
            totalRevenue: totals.totalRevenue,
        };
    }
    calculateConversion(analytics, bookingsCount) {
        const summary = analytics.summary;
        const viewsToLeads = summary.totalViews > 0
            ? (summary.totalLeads / summary.totalViews) * 100
            : 0;
        const leadsToBookings = summary.totalLeads > 0 ? (bookingsCount / summary.totalLeads) * 100 : 0;
        const bookingsToReviews = bookingsCount > 0 ? (summary.totalReviews / bookingsCount) * 100 : 0;
        return {
            viewsToLeads: Math.round(viewsToLeads * 100) / 100,
            leadsToBookings: Math.round(leadsToBookings * 100) / 100,
            bookingsToReviews: Math.round(bookingsToReviews * 100) / 100,
            avgResponseTime: 2.5,
        };
    }
    calculateTrends(data) {
        if (data.length < 2) {
            return {
                leadsTrend: 'stable',
                viewsTrend: 'stable',
                revenueTrend: 'stable',
                leadsChangePercent: 0,
                viewsChangePercent: 0,
                revenueChangePercent: 0,
            };
        }
        const firstHalf = data.slice(0, Math.floor(data.length / 2));
        const secondHalf = data.slice(Math.floor(data.length / 2));
        const getAvg = (arr, key) => arr.length === 0
            ? 0
            : arr.reduce((sum, d) => sum + d[key], 0) / arr.length;
        const firstAvg = {
            leads: getAvg(firstHalf, 'leadsCount'),
            views: getAvg(firstHalf, 'viewsCount'),
            revenue: getAvg(firstHalf, 'revenue'),
        };
        const secondAvg = {
            leads: getAvg(secondHalf, 'leadsCount'),
            views: getAvg(secondHalf, 'viewsCount'),
            revenue: getAvg(secondHalf, 'revenue'),
        };
        const calcChange = (oldVal, newVal) => oldVal > 0 ? ((newVal - oldVal) / oldVal) * 100 : 0;
        const leadsChange = calcChange(firstAvg.leads, secondAvg.leads);
        const viewsChange = calcChange(firstAvg.views, secondAvg.views);
        const revenueChange = calcChange(firstAvg.revenue, secondAvg.revenue);
        return {
            leadsTrend: Math.abs(leadsChange) < 5 ? 'stable' : leadsChange > 0 ? 'up' : 'down',
            viewsTrend: Math.abs(viewsChange) < 5 ? 'stable' : viewsChange > 0 ? 'up' : 'down',
            revenueTrend: Math.abs(revenueChange) < 5
                ? 'stable'
                : revenueChange > 0
                    ? 'up'
                    : 'down',
            leadsChangePercent: Math.round(leadsChange * 100) / 100,
            viewsChangePercent: Math.round(viewsChange * 100) / 100,
            revenueChangePercent: Math.round(revenueChange * 100) / 100,
        };
    }
    async calculateComparison(masterId, categoryId, cityId, days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const getAvgMetrics = async (where) => {
            const masters = await this.prisma.master.findMany({
                where: { ...where, id: { not: masterId } },
                include: { analytics: { where: { date: { gte: startDate } } } },
            });
            if (masters.length === 0)
                return { avgLeads: 0, avgViews: 0, avgRating: 0 };
            const totalLeads = masters.reduce((sum, m) => sum + m.analytics.reduce((s, a) => s + a.leadsCount, 0), 0);
            const totalViews = masters.reduce((sum, m) => sum + m.analytics.reduce((s, a) => s + a.viewsCount, 0), 0);
            const totalRating = masters.reduce((sum, m) => sum + (0, decimal_utils_1.decimalToNumber)(m.rating), 0);
            return {
                avgLeads: totalLeads / masters.length,
                avgViews: totalViews / masters.length,
                avgRating: totalRating / masters.length,
            };
        };
        return {
            categoryAvg: categoryId
                ? await getAvgMetrics({ categoryId })
                : { avgLeads: 0, avgViews: 0, avgRating: 0 },
            cityAvg: cityId
                ? await getAvgMetrics({ cityId })
                : { avgLeads: 0, avgViews: 0, avgRating: 0 },
            position: {
                inCategory: categoryId
                    ? await this.getMasterPosition(masterId, categoryId, 'category')
                    : 0,
                inCity: cityId
                    ? await this.getMasterPosition(masterId, cityId, 'city')
                    : 0,
            },
        };
    }
    async getMasterPosition(masterId, filterId, type) {
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            select: { rating: true, leadsCount: true },
        });
        if (!master)
            return 0;
        const where = type === 'category' ? { categoryId: filterId } : { cityId: filterId };
        const betterMasters = await this.prisma.master.count({
            where: {
                ...where,
                id: { not: masterId },
                OR: [
                    { rating: { gt: master.rating } },
                    { rating: master.rating, leadsCount: { gt: master.leadsCount } },
                ],
            },
        });
        return betterMasters + 1;
    }
    calculateForecast(data) {
        if (data.length < 7)
            return {
                nextWeekLeads: 0,
                nextWeekViews: 0,
                nextWeekRevenue: 0,
                confidence: 0,
            };
        const lastWeek = data.slice(-7);
        const getAvg = (key) => lastWeek.length === 0
            ? 0
            : lastWeek.reduce((sum, d) => sum + d[key], 0) / lastWeek.length;
        const avgLeads = getAvg('leadsCount');
        const avgViews = getAvg('viewsCount');
        const avgRevenue = getAvg('revenue');
        const values = lastWeek.map((d) => d.leadsCount);
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.length > 0
            ? values
                .map((v) => Math.pow(v - mean, 2))
                .reduce((sum, v) => sum + v, 0) / values.length
            : 0;
        const confidence = Math.max(0, Math.min(100, 100 - variance * 10));
        return {
            nextWeekLeads: Math.round(avgLeads * 7),
            nextWeekViews: Math.round(avgViews * 7),
            nextWeekRevenue: Math.round(avgRevenue * 7),
            confidence: Math.round(confidence),
        };
    }
    async getPeakHours(masterId, days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const leads = await this.prisma.lead.findMany({
            where: { masterId, createdAt: { gte: startDate } },
            select: { createdAt: true },
        });
        const hourStats = {};
        for (let i = 0; i < 24; i++)
            hourStats[i] = { leads: 0, views: 0 };
        leads.forEach((lead) => {
            const hour = new Date(lead.createdAt).getHours();
            hourStats[hour].leads++;
        });
        return Object.entries(hourStats)
            .map(([hour, stats]) => ({
            hour: parseInt(hour),
            leadsCount: stats.leads,
            viewsCount: 0,
        }))
            .sort((a, b) => b.leadsCount - a.leadsCount)
            .slice(0, 5);
    }
    async getTopSources(masterId, days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const leads = await this.prisma.lead.count({
            where: { masterId, createdAt: { gte: startDate } },
        });
        return [
            { source: 'Direct', leads: Math.floor(leads * 0.6), views: 0 },
            { source: 'Search', leads: Math.floor(leads * 0.3), views: 0 },
            { source: 'Referral', leads: Math.floor(leads * 0.1), views: 0 },
        ];
    }
    async getActivityHeatmap(masterId, days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const leads = await this.prisma.lead.findMany({
            where: { masterId, createdAt: { gte: startDate } },
            select: { createdAt: true },
        });
        const heatmapData = {};
        for (let d = 0; d < 7; d++) {
            for (let h = 0; h < 24; h++) {
                heatmapData[`${d}-${h}`] = 0;
            }
        }
        leads.forEach((lead) => {
            const date = new Date(lead.createdAt);
            const day = date.getDay();
            const hour = date.getHours();
            heatmapData[`${day}-${hour}`]++;
        });
        return Object.entries(heatmapData).map(([key, intensity]) => {
            const [dayOfWeek, hour] = key.split('-').map(Number);
            return { dayOfWeek, hour, intensity };
        });
    }
    generateInsights(analytics, trends, conversion) {
        const insights = [];
        if (trends.leadsChangePercent > 20) {
            insights.push(`Ваши лиды выросли на ${trends.leadsChangePercent}% по сравнению с прошлым периодом! 🔥`);
        }
        else if (trends.leadsChangePercent < -20) {
            insights.push(`Количество лидов снизилось на ${Math.abs(trends.leadsChangePercent)}%. Попробуйте обновить портфолио или добавить акцию.`);
        }
        if (conversion.viewsToLeads < 2) {
            insights.push('Низкая конверсия из просмотров в лиды. Возможно, стоит улучшить описание профиля или главное фото.');
        }
        if (conversion.leadsToBookings > 50) {
            insights.push('У вас отличная конверсия из лидов в запись! Клиенты высоко ценят ваше общение.');
        }
        if (analytics.summary.avgRating < 4.5 &&
            analytics.summary.totalReviews > 0) {
            insights.push('Ваш средний рейтинг ниже 4.5. Обратите внимание на отзывы и постарайтесь улучшить качество сервиса.');
        }
        if (insights.length === 0) {
            insights.push('Ваша статистика стабильна. Продолжайте в том же духе!');
        }
        return insights;
    }
};
exports.AnalyticsMasterService = AnalyticsMasterService;
exports.AnalyticsMasterService = AnalyticsMasterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsMasterService);
//# sourceMappingURL=analytics-master.service.js.map