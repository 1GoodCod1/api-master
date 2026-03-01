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
exports.PaymentsUpgradeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const payments_mia_service_1 = require("./payments-mia.service");
const plans_1 = require("../../../common/helpers/plans");
let PaymentsUpgradeService = class PaymentsUpgradeService {
    prisma;
    miaService;
    constructor(prisma, miaService) {
        this.prisma = prisma;
        this.miaService = miaService;
    }
    async confirmPendingUpgrade(userId) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
        });
        if (!master)
            throw new common_1.NotFoundException('Master not found');
        if (!master.pendingUpgradeTo || !master.pendingUpgradeCreatedAt) {
            throw new common_1.BadRequestException('No pending upgrade found');
        }
        const hoursSinceCreation = (Date.now() - master.pendingUpgradeCreatedAt.getTime()) /
            (1000 * 60 * 60);
        if (hoursSinceCreation > 12) {
            await this.resetPendingUpgrade(master.id);
            throw new common_1.BadRequestException('Pending upgrade has expired. Please try again.');
        }
        if ((0, plans_1.getEffectiveTariff)(master) !== 'VIP') {
            await this.resetPendingUpgrade(master.id);
            throw new common_1.BadRequestException('Current tariff is not VIP. Cannot upgrade to PREMIUM.');
        }
        const result = await this.miaService.createTariffQrPayment({ masterId: master.id, tariffType: master.pendingUpgradeTo }, userId);
        await this.resetPendingUpgrade(master.id);
        return result;
    }
    async cancelPendingUpgrade(userId) {
        const master = await this.prisma.master.findUnique({ where: { userId } });
        if (!master)
            throw new common_1.NotFoundException('Master not found');
        if (!master.pendingUpgradeTo)
            throw new common_1.BadRequestException('No pending upgrade found');
        await this.resetPendingUpgrade(master.id);
        return { message: 'Pending upgrade cancelled' };
    }
    async cancelTariffAtPeriodEnd(userId) {
        const master = await this.prisma.master.findUnique({
            where: { userId },
            select: {
                id: true,
                tariffType: true,
                tariffExpiresAt: true,
            },
        });
        if (!master)
            throw new common_1.NotFoundException('Master not found');
        if (master.tariffType === 'BASIC' || !master.tariffExpiresAt) {
            throw new common_1.BadRequestException('No active paid tariff to cancel.');
        }
        if (master.tariffExpiresAt.getTime() <= Date.now()) {
            throw new common_1.BadRequestException('Tariff already expired.');
        }
        await this.prisma.master.update({
            where: { id: master.id },
            data: { tariffCancelAtPeriodEnd: true },
        });
        return {
            message: 'Subscription will cancel at period end.',
            tariffExpiresAt: master.tariffExpiresAt,
        };
    }
    async resetPendingUpgrade(masterId) {
        await this.prisma.master.update({
            where: { id: masterId },
            data: { pendingUpgradeTo: null, pendingUpgradeCreatedAt: null },
        });
    }
};
exports.PaymentsUpgradeService = PaymentsUpgradeService;
exports.PaymentsUpgradeService = PaymentsUpgradeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payments_mia_service_1.PaymentsMiaService])
], PaymentsUpgradeService);
//# sourceMappingURL=payments-upgrade.service.js.map