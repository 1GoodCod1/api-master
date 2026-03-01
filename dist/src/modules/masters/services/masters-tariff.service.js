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
exports.MastersTariffService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
let MastersTariffService = class MastersTariffService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTariff(userId) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
            select: {
                tariffType: true,
                tariffExpiresAt: true,
                tariffCancelAtPeriodEnd: true,
                pendingUpgradeTo: true,
                pendingUpgradeCreatedAt: true,
                payments: {
                    where: { status: constants_1.PaymentStatus.SUCCESS },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
        if (!master) {
            throw new common_1.NotFoundException('Master not found');
        }
        const isExpired = master.tariffExpiresAt && master.tariffExpiresAt < new Date();
        let pendingUpgrade = null;
        if (master.pendingUpgradeTo && master.pendingUpgradeCreatedAt) {
            const hoursSinceCreation = (Date.now() - master.pendingUpgradeCreatedAt.getTime()) /
                (1000 * 60 * 60);
            if (hoursSinceCreation <= 12) {
                pendingUpgrade = {
                    to: master.pendingUpgradeTo,
                    createdAt: master.pendingUpgradeCreatedAt,
                    expiresAt: new Date(master.pendingUpgradeCreatedAt.getTime() + 12 * 60 * 60 * 1000),
                    hoursRemaining: Math.max(0, 12 - hoursSinceCreation),
                };
            }
        }
        const tariffCancelAtPeriodEnd = Boolean(master.tariffCancelAtPeriodEnd);
        const isExpiredResult = Boolean(isExpired);
        const payments = master.payments;
        const lastPayment = payments.at(0) ?? null;
        return {
            tariffType: master.tariffType,
            tariffExpiresAt: master.tariffExpiresAt,
            tariffCancelAtPeriodEnd,
            isExpired: isExpiredResult,
            pendingUpgrade,
            lastPayment,
        };
    }
    async updateTariff(masterId, tariffTypeStr, days, onCacheInvalidate) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
        let tariffType;
        switch (tariffTypeStr) {
            case 'VIP':
                tariffType = client_1.TariffType.VIP;
                break;
            case 'PREMIUM':
                tariffType = client_1.TariffType.PREMIUM;
                break;
            default:
                tariffType = client_1.TariffType.BASIC;
        }
        const master = await this.prisma.master.update({
            where: { id: masterId },
            data: {
                tariffType,
                tariffExpiresAt: expiresAt,
                isFeatured: tariffType === client_1.TariffType.VIP || tariffType === client_1.TariffType.PREMIUM,
            },
        });
        if (onCacheInvalidate) {
            await onCacheInvalidate(masterId, master.slug);
        }
        return master;
    }
};
exports.MastersTariffService = MastersTariffService;
exports.MastersTariffService = MastersTariffService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MastersTariffService);
//# sourceMappingURL=masters-tariff.service.js.map