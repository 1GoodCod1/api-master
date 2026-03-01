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
exports.MastersStatsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
function getStartOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function getStartOfISOWeek(d) {
    const x = new Date(d);
    const day = x.getDay();
    const daysToMonday = day === 0 ? 6 : day - 1;
    x.setDate(x.getDate() - daysToMonday);
    x.setHours(0, 0, 0, 0);
    return x;
}
function getStartOfMonth(d) {
    const x = new Date(d);
    x.setDate(1);
    x.setHours(0, 0, 0, 0);
    return x;
}
let MastersStatsService = class MastersStatsService {
    prisma;
    cache;
    constructor(prisma, cache) {
        this.prisma = prisma;
        this.cache = cache;
    }
    async getStats(masterId) {
        const cacheKey = this.cache.keys.masterStats(masterId);
        const now = new Date();
        return this.cache.getOrSet(cacheKey, async () => {
            const todayStart = getStartOfDay(now);
            const weekStart = getStartOfISOWeek(now);
            const monthStart = getStartOfMonth(now);
            const master = await this.prisma.master.findUnique({
                where: { id: masterId },
                select: { userId: true },
            });
            const masterUserId = master?.userId ?? null;
            const viewsWhere = {
                masterId,
                action: 'view',
                ...(masterUserId && {
                    OR: [{ userId: null }, { userId: { not: masterUserId } }],
                }),
            };
            const [today, weekAgo, monthAgo, viewsToday, viewsThisWeek, viewsThisMonth,] = await Promise.all([
                this.prisma.lead.count({
                    where: { masterId, createdAt: { gte: todayStart } },
                }),
                this.prisma.lead.count({
                    where: { masterId, createdAt: { gte: weekStart } },
                }),
                this.prisma.lead.count({
                    where: { masterId, createdAt: { gte: monthStart } },
                }),
                this.prisma.userActivity.count({
                    where: { ...viewsWhere, createdAt: { gte: todayStart } },
                }),
                this.prisma.userActivity.count({
                    where: { ...viewsWhere, createdAt: { gte: weekStart } },
                }),
                this.prisma.userActivity.count({
                    where: { ...viewsWhere, createdAt: { gte: monthStart } },
                }),
            ]);
            return {
                leadsToday: today,
                leadsThisWeek: weekAgo,
                leadsThisMonth: monthAgo,
                viewsToday,
                viewsThisWeek,
                viewsThisMonth,
            };
        }, this.cache.ttl.masterStats);
    }
    async getViewsHistory(masterId, period, limit = 12) {
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            select: { userId: true },
        });
        const masterUserId = master?.userId ?? null;
        const viewsWhere = {
            masterId,
            action: 'view',
            ...(masterUserId && {
                OR: [{ userId: null }, { userId: { not: masterUserId } }],
            }),
        };
        if (period === 'week') {
            const weeks = [];
            let cursor = getStartOfISOWeek(new Date());
            for (let i = 0; i < limit; i++) {
                const weekEnd = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
                weeks.push({ start: new Date(cursor), end: weekEnd });
                cursor = new Date(cursor.getTime() - 7 * 24 * 60 * 60 * 1000);
            }
            const results = await Promise.all(weeks.map(async (w) => {
                const count = await this.prisma.userActivity.count({
                    where: {
                        ...viewsWhere,
                        createdAt: { gte: w.start, lte: w.end },
                    },
                });
                const label = `${w.start.getDate()}.${w.start.getMonth() + 1} - ${w.end.getDate()}.${w.end.getMonth() + 1}.${w.end.getFullYear()}`;
                return {
                    periodStart: w.start.toISOString(),
                    periodEnd: w.end.toISOString(),
                    views: count,
                    label,
                };
            }));
            return results;
        }
        const months = [];
        let monthCursor = getStartOfMonth(new Date());
        for (let i = 0; i < limit; i++) {
            const start = new Date(monthCursor);
            const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
            months.push({ start, end });
            monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1);
        }
        const results = await Promise.all(months.map(async (m) => {
            const count = await this.prisma.userActivity.count({
                where: {
                    ...viewsWhere,
                    createdAt: { gte: m.start, lte: m.end },
                },
            });
            const label = `${m.start.getMonth() + 1}/${m.start.getFullYear()}`;
            return {
                periodStart: m.start.toISOString(),
                periodEnd: m.end.toISOString(),
                views: count,
                label,
            };
        }));
        return results;
    }
};
exports.MastersStatsService = MastersStatsService;
exports.MastersStatsService = MastersStatsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], MastersStatsService);
//# sourceMappingURL=masters-stats.service.js.map