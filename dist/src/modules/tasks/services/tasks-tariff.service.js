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
var TasksTariffService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksTariffService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
const notifications_service_1 = require("../../notifications/notifications.service");
const in_app_notification_service_1 = require("../../notifications/services/in-app-notification.service");
let TasksTariffService = TasksTariffService_1 = class TasksTariffService {
    prisma;
    notifications;
    inAppNotifications;
    logger = new common_1.Logger(TasksTariffService_1.name);
    constructor(prisma, notifications, inAppNotifications) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.inAppNotifications = inAppNotifications;
    }
    async autoBoostMasters() {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const premiumMasters = await this.prisma.master.findMany({
            where: {
                tariffType: 'PREMIUM',
                tariffExpiresAt: { gt: now },
            },
            include: {
                _count: {
                    select: {
                        leads: { where: { createdAt: { gte: sevenDaysAgo } } },
                        reviews: { where: { createdAt: { gte: sevenDaysAgo } } },
                    },
                },
            },
        });
        this.logger.log(`Auto-boosting ${premiumMasters.length} PREMIUM masters`);
        for (const master of premiumMasters) {
            const activityScore = master._count.leads * 0.3 +
                master._count.reviews * 0.2 +
                Math.min(master.views / 100, 1) * 0.1;
            if (activityScore > 0) {
                this.logger.debug(`Master ${master.id}: leads=${master._count.leads}, reviews=${master._count.reviews}, views=${master.views}, score=${activityScore.toFixed(2)}`);
            }
        }
        const lowActivityMasters = premiumMasters.filter((m) => m._count.leads === 0 && m._count.reviews === 0 && m.views < 10);
        if (lowActivityMasters.length > 0) {
            this.logger.warn(`${lowActivityMasters.length} PREMIUM masters have low activity. Consider sending engagement tips.`);
        }
    }
    async checkExpiredTariffs() {
        const now = new Date();
        const expiredMasters = await this.prisma.master.findMany({
            where: {
                tariffExpiresAt: { lt: now },
                tariffType: { not: 'BASIC' },
            },
            include: { user: true },
        });
        for (const master of expiredMasters) {
            await this.prisma.master.update({
                where: { id: master.id },
                data: {
                    tariffType: 'BASIC',
                    tariffExpiresAt: null,
                    tariffCancelAtPeriodEnd: false,
                    isFeatured: false,
                },
            });
            await this.notifications.sendSMS(master.user.phone, `Ваш тариф истек. Текущий тариф: BASIC. Для продления посетите личный кабинет.`, { userId: master.userId });
            await this.inAppNotifications
                .notifySubscriptionExpired(master.userId, {
                tariffType: master.tariffType,
                masterId: master.id,
            })
                .catch((e) => {
                const msg = e instanceof Error ? e.message : String(e);
                this.logger.warn(`Failed to send in-app subscription expired: ${msg}`);
            });
        }
        this.logger.log(`Checked ${expiredMasters.length} expired tariffs`);
    }
    async checkPendingUpgradeTimeouts() {
        const now = new Date();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const expiredPendingUpgrades = await this.prisma.master.findMany({
            where: {
                pendingUpgradeTo: { not: null },
                pendingUpgradeCreatedAt: { lte: twelveHoursAgo },
            },
            include: { user: true },
        });
        for (const master of expiredPendingUpgrades) {
            const lastPayment = await this.prisma.payment.findFirst({
                where: { masterId: master.id, status: constants_1.PaymentStatus.SUCCESS },
                orderBy: { createdAt: 'desc' },
            });
            const newTariffType = lastPayment ? master.tariffType : 'BASIC';
            await this.prisma.master.update({
                where: { id: master.id },
                data: {
                    pendingUpgradeTo: null,
                    pendingUpgradeCreatedAt: null,
                    tariffType: newTariffType,
                    isFeatured: newTariffType !== 'BASIC',
                    ...(newTariffType === 'BASIC' && !lastPayment
                        ? { tariffExpiresAt: null }
                        : {}),
                },
            });
            const message = lastPayment
                ? `Ваш запрос на обновление до PREMIUM истек (12 часов). Вы остаетесь на текущем тарифе ${master.tariffType}.`
                : `Ваш запрос на обновление до PREMIUM истек (12 часов). Тариф изменен на BASIC.`;
            await this.notifications.sendSMS(master.user.phone, message, {
                userId: master.userId,
            });
            await this.inAppNotifications
                .notifySubscriptionExpired(master.userId, {
                tariffType: master.tariffType,
                masterId: master.id,
            })
                .catch((e) => {
                const msg = e instanceof Error ? e.message : String(e);
                this.logger.warn(`Failed to send in-app upgrade timeout: ${msg}`);
            });
        }
        if (expiredPendingUpgrades.length > 0) {
            this.logger.log(`Cancelled ${expiredPendingUpgrades.length} expired pending upgrades`);
        }
    }
    async sendTariffExpirationReminders() {
        const now = new Date();
        const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const mastersToNotify = await this.prisma.master.findMany({
            where: {
                tariffType: { in: ['VIP', 'PREMIUM'] },
                tariffExpiresAt: {
                    gte: new Date(twoDaysFromNow.getTime() - 60 * 60 * 1000),
                    lte: new Date(twoDaysFromNow.getTime() + 60 * 60 * 1000),
                },
            },
            include: { user: true },
        });
        for (const master of mastersToNotify) {
            const recentNotifications = await this.prisma.notification.findMany({
                where: {
                    userId: master.userId,
                    type: 'SMS',
                    message: { contains: 'истекает' },
                    createdAt: { gte: oneDayAgo },
                },
                take: 1,
            });
            if (recentNotifications.length > 0)
                continue;
            const daysUntilExpiry = Math.ceil((master.tariffExpiresAt.getTime() - now.getTime()) /
                (24 * 60 * 60 * 1000));
            const message = `Ваш тариф ${master.tariffType} истекает через ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'день' : 'дня'}. Обновите тариф в личном кабинете.`;
            await this.notifications.sendSMS(master.user.phone, message, {
                userId: master.userId,
                metadata: {
                    masterId: master.id,
                    tariffType: master.tariffType,
                    expiresAt: master.tariffExpiresAt,
                    daysUntilExpiry,
                },
            });
            await this.inAppNotifications
                .notifySubscriptionExpiring(master.userId, {
                daysLeft: daysUntilExpiry,
                tariffType: master.tariffType,
                expiresAt: master.tariffExpiresAt,
                masterId: master.id,
            })
                .catch((e) => {
                const msg = e instanceof Error ? e.message : String(e);
                this.logger.warn(`Failed to send in-app expiring: ${msg}`);
            });
        }
        if (mastersToNotify.length > 0) {
            this.logger.log(`Sent expiration reminders to ${mastersToNotify.length} masters`);
        }
    }
};
exports.TasksTariffService = TasksTariffService;
exports.TasksTariffService = TasksTariffService = TasksTariffService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        in_app_notification_service_1.InAppNotificationService])
], TasksTariffService);
//# sourceMappingURL=tasks-tariff.service.js.map