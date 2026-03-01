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
var PaymentsWebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsWebhookService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const in_app_notification_service_1 = require("../../notifications/services/in-app-notification.service");
const cache_service_1 = require("../../shared/cache/cache.service");
const client_1 = require("@prisma/client");
const constants_1 = require("../../../common/constants");
let PaymentsWebhookService = PaymentsWebhookService_1 = class PaymentsWebhookService {
    prisma;
    inAppNotifications;
    cache;
    logger = new common_1.Logger(PaymentsWebhookService_1.name);
    constructor(prisma, inAppNotifications, cache) {
        this.prisma = prisma;
        this.inAppNotifications = inAppNotifications;
        this.cache = cache;
    }
    async completeMiaTariffPayment(orderId) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: orderId },
        });
        if (!payment || payment.status !== constants_1.PaymentStatus.PENDING)
            return;
        const meta = payment.metadata || {};
        if (meta.provider !== 'MIA')
            return;
        await this.prisma.payment.update({
            where: { id: orderId },
            data: { status: constants_1.PaymentStatus.SUCCESS, paidAt: new Date() },
        });
        const days = meta.days ?? 30;
        if (payment.tariffType) {
            await this.updateMasterTariff(payment.masterId, String(payment.tariffType), days);
            try {
                const master = await this.prisma.master.findUnique({
                    where: { id: payment.masterId },
                    select: { userId: true },
                });
                if (master) {
                    await this.inAppNotifications.notifyPaymentSuccess(master.userId, {
                        paymentId: orderId,
                        tariffType: String(payment.tariffType),
                        amount: String(payment.amount),
                    });
                }
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                this.logger.warn(`Failed to send in-app payment notification: ${msg}`);
            }
        }
    }
    async updateMasterTariff(masterId, tariffTypeStr, days) {
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
                isFeatured: tariffType !== client_1.TariffType.BASIC,
                tariffCancelAtPeriodEnd: false,
                pendingUpgradeTo: null,
                pendingUpgradeCreatedAt: null,
            },
            select: { userId: true },
        });
        await this.invalidateCachesForTariffChange(masterId, master.userId);
    }
    async invalidateCachesForTariffChange(masterId, userId) {
        try {
            await Promise.all([
                this.cache.del(this.cache.keys.userMasterProfile(userId)),
                this.cache.del(this.cache.keys.userProfile(userId)),
                this.cache.invalidate(`cache:master:${masterId}:*`),
                this.cache.invalidate('cache:search:masters:*'),
                this.cache.invalidate('cache:masters:top:*'),
                this.cache.invalidate('cache:masters:popular:*'),
                this.cache.invalidate('cache:masters:new:*'),
            ]);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(`Failed to invalidate caches after tariff change: ${msg}`);
        }
    }
};
exports.PaymentsWebhookService = PaymentsWebhookService;
exports.PaymentsWebhookService = PaymentsWebhookService = PaymentsWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        in_app_notification_service_1.InAppNotificationService,
        cache_service_1.CacheService])
], PaymentsWebhookService);
//# sourceMappingURL=payments-webhook.service.js.map