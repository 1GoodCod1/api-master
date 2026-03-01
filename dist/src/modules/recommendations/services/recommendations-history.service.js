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
exports.RecommendationsHistoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
let RecommendationsHistoryService = class RecommendationsHistoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRecentlyViewed(userId, sessionId, limit = 10) {
        const or = [];
        if (userId)
            or.push({ userId });
        if (sessionId)
            or.push({ sessionId });
        if (or.length === 0)
            return [];
        const activities = await this.prisma.userActivity.findMany({
            where: {
                OR: or,
                action: 'view',
                masterId: { not: null },
            },
            orderBy: { createdAt: 'desc' },
            take: limit * 2,
            distinct: ['masterId'],
        });
        const masterIds = activities
            .map((a) => a.masterId)
            .filter(Boolean);
        if (masterIds.length === 0)
            return [];
        const masters = await this.prisma.master.findMany({
            where: {
                id: { in: masterIds },
                user: { isBanned: false },
            },
            include: {
                category: true,
                city: true,
                user: { select: { id: true, isVerified: true } },
                photos: { take: 1, include: { file: true } },
            },
        });
        return masterIds
            .map((id) => masters.find((m) => m.id === id))
            .filter(Boolean)
            .slice(0, limit);
    }
};
exports.RecommendationsHistoryService = RecommendationsHistoryService;
exports.RecommendationsHistoryService = RecommendationsHistoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RecommendationsHistoryService);
//# sourceMappingURL=recommendations-history.service.js.map