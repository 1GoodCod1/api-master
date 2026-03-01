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
exports.LeadsAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
let LeadsAnalyticsService = class LeadsAnalyticsService {
    prisma;
    cache;
    constructor(prisma, cache) {
        this.prisma = prisma;
        this.cache = cache;
    }
    async handlePostCreation(masterId) {
        await this.prisma.master.update({
            where: { id: masterId },
            data: { leadsCount: { increment: 1 } },
        });
        await this.cache.invalidate(`cache:master:${masterId}:leads:*`);
        await this.cache.del(this.cache.keys.masterStats(masterId));
        await this.updateDailyAnalytics(masterId);
    }
    async updateDailyAnalytics(masterId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await this.prisma.masterAnalytics.upsert({
            where: {
                masterId_date: {
                    masterId,
                    date: today,
                },
            },
            update: {
                leadsCount: { increment: 1 },
            },
            create: {
                masterId,
                date: today,
                leadsCount: 1,
            },
        });
    }
};
exports.LeadsAnalyticsService = LeadsAnalyticsService;
exports.LeadsAnalyticsService = LeadsAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], LeadsAnalyticsService);
//# sourceMappingURL=leads-analytics.service.js.map