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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../shared/database/prisma.service");
const analytics_master_service_1 = require("./services/analytics-master.service");
const analytics_business_service_1 = require("./services/analytics-business.service");
const analytics_system_service_1 = require("./services/analytics-system.service");
let AnalyticsService = class AnalyticsService {
    prisma;
    masterAnalytics;
    businessAnalytics;
    systemAnalytics;
    constructor(prisma, masterAnalytics, businessAnalytics, systemAnalytics) {
        this.prisma = prisma;
        this.masterAnalytics = masterAnalytics;
        this.businessAnalytics = businessAnalytics;
        this.systemAnalytics = systemAnalytics;
    }
    async getAnalyticsForUser(user, masterId, requestedDays = 7) {
        if (user.role !== 'ADMIN' && user.masterProfile?.id !== masterId) {
            throw new common_1.ForbiddenException('You can only view your own analytics');
        }
        const master = await this.getMasterTariff(masterId);
        if (!master) {
            throw new Error('Master profile not found');
        }
        let days = requestedDays;
        if (user.role !== 'ADMIN') {
            const isPremium = this.isTariffActive(master.tariffType, master.tariffExpiresAt);
            const maxDays = isPremium ? 30 : 7;
            days = Math.min(requestedDays, maxDays);
        }
        return this.masterAnalytics.getMasterAnalytics(masterId, days);
    }
    async getMyAnalytics(user, requestedDays) {
        const masterId = user.masterProfile?.id;
        if (!masterId) {
            throw new Error('Master profile not found');
        }
        const master = await this.getMasterTariff(masterId);
        if (!master) {
            throw new Error('Master profile not found');
        }
        const isPremium = this.isTariffActive(master.tariffType, master.tariffExpiresAt);
        const maxDays = isPremium ? 30 : 7;
        const days = requestedDays ? Math.min(requestedDays, maxDays) : maxDays;
        if (isPremium) {
            return this.masterAnalytics.getAdvancedMasterAnalytics(masterId, days);
        }
        else {
            return this.masterAnalytics.getMasterAnalytics(masterId, days);
        }
    }
    async getMyAdvancedAnalytics(user, requestedDays = 30) {
        const masterId = user.masterProfile?.id;
        if (!masterId) {
            throw new Error('Master profile not found');
        }
        const days = Math.min(requestedDays, 30);
        return this.masterAnalytics.getAdvancedMasterAnalytics(masterId, days);
    }
    async getBusinessAnalytics(days = 30) {
        return this.businessAnalytics.getBusinessAnalytics(days);
    }
    async getSystemAnalytics() {
        return this.systemAnalytics.getSystemAnalytics();
    }
    async getMasterTariff(masterId) {
        return this.prisma.master.findUnique({
            where: { id: masterId },
            select: { tariffType: true, tariffExpiresAt: true },
        });
    }
    isTariffActive(tariffType, expiresAt) {
        const isVipOrPremium = tariffType === 'VIP' || tariffType === 'PREMIUM';
        return !!(isVipOrPremium && expiresAt && new Date(expiresAt) > new Date());
    }
    async getMasterAnalytics(masterId, days = 7) {
        return this.masterAnalytics.getMasterAnalytics(masterId, days);
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        analytics_master_service_1.AnalyticsMasterService,
        analytics_business_service_1.AnalyticsBusinessService,
        analytics_system_service_1.AnalyticsSystemService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map