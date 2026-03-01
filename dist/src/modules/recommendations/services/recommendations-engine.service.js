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
exports.RecommendationsEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
let RecommendationsEngineService = class RecommendationsEngineService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculateScores(userId, sessionId, limit = 10) {
        const scores = new Map();
        const userDependent = userId
            ? Promise.all([
                this.scoreBasedOnViews(scores, userId, sessionId),
                this.scoreBasedOnPopularity(scores),
                this.scoreBasedOnFavorites(scores, userId),
                this.scoreBasedOnLeads(scores, userId),
                this.scoreBasedOnCategories(scores, userId, sessionId),
            ])
            : Promise.all([
                this.scoreBasedOnViews(scores, userId, sessionId),
                this.scoreBasedOnPopularity(scores),
                this.scoreBasedOnCategories(scores, userId, sessionId),
            ]);
        await userDependent;
        const sortedScores = Array.from(scores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        const masterIds = sortedScores.map((s) => s.masterId);
        if (!masterIds.length)
            return [];
        const masters = await this.prisma.master.findMany({
            where: { id: { in: masterIds }, user: { isBanned: false } },
            include: {
                category: true,
                city: true,
                user: { select: { id: true, isVerified: true } },
                photos: { take: 1, include: { file: true } },
            },
        });
        return masterIds
            .map((id) => {
            const master = masters.find((m) => m.id === id);
            const scoreData = scores.get(id);
            return master
                ? {
                    ...master,
                    recommendationScore: scoreData?.score,
                    reasons: scoreData?.reasons,
                }
                : null;
        })
            .filter(Boolean);
    }
    async getSimilarMasters(masterId, limit = 5) {
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            select: { categoryId: true, rating: true },
        });
        if (!master)
            return [];
        return this.prisma.master.findMany({
            where: {
                id: { not: masterId },
                categoryId: master.categoryId,
                rating: { gte: master.rating - 0.5 },
                user: { isBanned: false },
            },
            orderBy: [{ rating: 'desc' }, { totalReviews: 'desc' }],
            take: limit,
            include: {
                category: true,
                city: true,
                user: { select: { id: true, isVerified: true } },
                photos: { take: 1, include: { file: true } },
            },
        });
    }
    async scoreBasedOnViews(scores, userId, sessionId) {
        const or = [];
        if (userId)
            or.push({ userId });
        if (sessionId)
            or.push({ sessionId });
        if (!or.length)
            return;
        const views = await this.prisma.userActivity.findMany({
            where: { OR: or, action: 'view', masterId: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        if (!views.length)
            return;
        const viewedIds = views.map((v) => v.masterId);
        const viewedMasters = await this.prisma.master.findMany({
            where: { id: { in: viewedIds } },
            select: { categoryId: true, cityId: true },
        });
        const categoryIds = [...new Set(viewedMasters.map((m) => m.categoryId))];
        const cityIds = [...new Set(viewedMasters.map((m) => m.cityId))];
        const similar = await this.prisma.master.findMany({
            where: {
                OR: [{ categoryId: { in: categoryIds } }, { cityId: { in: cityIds } }],
                id: { notIn: viewedIds },
            },
            take: 30,
            select: { id: true, categoryId: true, cityId: true },
        });
        for (const m of similar) {
            const s = this.getScore(scores, m.id);
            if (categoryIds.includes(m.categoryId)) {
                s.score += 15;
                s.reasons.push('similar_category');
            }
            if (cityIds.includes(m.cityId)) {
                s.score += 10;
                s.reasons.push('your_city');
            }
            scores.set(m.id, s);
        }
    }
    async scoreBasedOnFavorites(scores, userId) {
        const favs = await this.prisma.favorite.findMany({
            where: { userId },
            include: {
                master: { select: { id: true, categoryId: true, cityId: true } },
            },
            take: 10,
        });
        if (!favs.length)
            return;
        const catIds = [...new Set(favs.map((f) => f.master.categoryId))];
        const cityIds = [...new Set(favs.map((f) => f.master.cityId))];
        const favMasterIds = favs.map((f) => f.masterId);
        const similar = await this.prisma.master.findMany({
            where: {
                OR: [{ categoryId: { in: catIds } }, { cityId: { in: cityIds } }],
                id: { notIn: favMasterIds },
            },
            take: 20,
            select: { id: true, categoryId: true, cityId: true },
        });
        for (const m of similar) {
            const s = this.getScore(scores, m.id);
            if (catIds.includes(m.categoryId)) {
                s.score += 20;
                s.reasons.push('like_favorites');
            }
            if (cityIds.includes(m.cityId)) {
                s.score += 12;
                s.reasons.push('your_city');
            }
            scores.set(m.id, s);
        }
    }
    async scoreBasedOnLeads(scores, userId) {
        const leads = await this.prisma.lead.findMany({
            where: { clientId: userId },
            include: {
                master: { select: { id: true, categoryId: true, cityId: true } },
            },
            take: 10,
        });
        if (!leads.length)
            return;
        const catIds = [...new Set(leads.map((l) => l.master.categoryId))];
        const cityIds = [...new Set(leads.map((l) => l.master.cityId))];
        const leadIds = leads.map((l) => l.masterId);
        const similar = await this.prisma.master.findMany({
            where: {
                OR: [{ categoryId: { in: catIds } }, { cityId: { in: cityIds } }],
                id: { notIn: leadIds },
            },
            take: 20,
            select: { id: true, categoryId: true, cityId: true },
        });
        for (const m of similar) {
            const s = this.getScore(scores, m.id);
            if (catIds.includes(m.categoryId)) {
                s.score += 25;
                s.reasons.push('similar_services');
            }
            if (cityIds.includes(m.cityId)) {
                s.score += 15;
                s.reasons.push('your_city');
            }
            scores.set(m.id, s);
        }
    }
    async scoreBasedOnPopularity(scores) {
        const popular = await this.prisma.master.findMany({
            where: {
                rating: { gte: 4.5 },
                totalReviews: { gte: 10 },
                user: { isBanned: false },
            },
            orderBy: [{ rating: 'desc' }, { totalReviews: 'desc' }],
            take: 20,
            select: { id: true, rating: true, totalReviews: true },
        });
        for (const m of popular) {
            const s = this.getScore(scores, m.id);
            s.score += Math.min(m.rating * 2 + m.totalReviews * 0.1, 20);
            s.reasons.push('popular');
            scores.set(m.id, s);
        }
    }
    async scoreBasedOnCategories(scores, userId, sessionId) {
        const or = [];
        if (userId)
            or.push({ userId });
        if (sessionId)
            or.push({ sessionId });
        if (!or.length)
            return;
        const acts = await this.prisma.userActivity.findMany({
            where: { OR: or, categoryId: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        if (!acts.length)
            return;
        const freq = new Map();
        for (const a of acts)
            if (a.categoryId)
                freq.set(a.categoryId, (freq.get(a.categoryId) || 0) + 1);
        const topCats = Array.from(freq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id]) => id);
        const masters = await this.prisma.master.findMany({
            where: { categoryId: { in: topCats } },
            orderBy: { rating: 'desc' },
            take: 15,
            select: { id: true },
        });
        for (const m of masters) {
            const s = this.getScore(scores, m.id);
            s.score += 8;
            s.reasons.push('interesting_category');
            scores.set(m.id, s);
        }
    }
    getScore(scores, masterId) {
        return scores.get(masterId) || { masterId, score: 0, reasons: [] };
    }
};
exports.RecommendationsEngineService = RecommendationsEngineService;
exports.RecommendationsEngineService = RecommendationsEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RecommendationsEngineService);
//# sourceMappingURL=recommendations-engine.service.js.map