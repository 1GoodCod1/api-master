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
var InAppNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppNotificationService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
const websocket_service_1 = require("../../websocket/websocket.service");
let InAppNotificationService = InAppNotificationService_1 = class InAppNotificationService {
    prisma;
    websocketService;
    logger = new common_1.Logger(InAppNotificationService_1.name);
    constructor(prisma, websocketService) {
        this.prisma = prisma;
        this.websocketService = websocketService;
    }
    async notify(params) {
        try {
            const notification = await this.prisma.notification.create({
                data: {
                    userId: params.userId,
                    type: 'IN_APP',
                    category: params.category,
                    title: params.title,
                    message: params.message,
                    status: constants_1.NotificationStatus.DELIVERED,
                    sentAt: new Date(),
                    metadata: params.metadata ?? undefined,
                },
            });
            await this.websocketService.sendToUser(params.userId, 'notification', {
                id: notification.id,
                type: this.categoryToEventType(params.category),
                category: params.category,
                title: params.title,
                message: params.message,
                data: params.metadata ?? {},
                timestamp: notification.createdAt.toISOString(),
                priority: params.priority ?? 'normal',
            });
            this.logger.debug(`In-app notification sent to user ${params.userId}: ${params.category}`);
            return notification;
        }
        catch (error) {
            this.logger.error(`Failed to send in-app notification: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async notifyAdmins(params) {
        try {
            const admins = await this.prisma.user.findMany({
                where: { role: 'ADMIN', isBanned: false },
                select: { id: true },
            });
            const notifications = await Promise.all(admins.map((admin) => this.prisma.notification.create({
                data: {
                    userId: admin.id,
                    type: 'IN_APP',
                    category: params.category,
                    title: params.title,
                    message: params.message,
                    status: constants_1.NotificationStatus.DELIVERED,
                    sentAt: new Date(),
                    metadata: params.metadata ?? undefined,
                },
            })));
            this.websocketService.sendToAdmins('notification', {
                type: this.categoryToEventType(params.category),
                category: params.category,
                title: params.title,
                message: params.message,
                data: params.metadata ?? {},
                timestamp: new Date().toISOString(),
                priority: 'normal',
            });
            this.logger.debug(`Admin notification sent to ${admins.length} admins: ${params.category}`);
            return notifications;
        }
        catch (error) {
            this.logger.error(`Failed to send admin notification: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async notifyNewLead(masterUserId, data) {
        const clientName = data.clientName || 'клиента';
        await this.notify({
            userId: masterUserId,
            category: 'NEW_LEAD',
            title: 'Новая заявка',
            message: `Новая заявка от ${clientName}`,
            metadata: data,
            priority: 'high',
        });
        await this.notifyAdmins({
            category: 'ADMIN_NEW_LEAD',
            title: 'Новая заявка',
            message: `Заявка от ${clientName} для мастера`,
            metadata: data,
        });
    }
    async notifyLeadStatusUpdated(masterUserId, data) {
        await this.notify({
            userId: masterUserId,
            category: 'LEAD_STATUS_UPDATED',
            title: 'Статус заявки обновлён',
            message: `Заявка #${data.leadId.slice(0, 8)} — ${data.status}`,
            metadata: data,
        });
    }
    async notifyNewReview(masterUserId, data) {
        const authorName = data.authorName || 'Пользователь';
        await this.notify({
            userId: masterUserId,
            category: 'NEW_REVIEW',
            title: 'Новый отзыв',
            message: `${authorName} оставил отзыв с оценкой ${data.rating}/5`,
            metadata: data,
            priority: 'normal',
        });
        await this.notifyAdmins({
            category: 'ADMIN_NEW_REVIEW',
            title: 'Новый отзыв',
            message: `Отзыв от ${authorName} — ${data.rating}/5`,
            metadata: data,
        });
    }
    async notifyNewChatMessage(recipientUserId, data) {
        const senderLabel = data.senderType === 'MASTER' ? 'мастера' : 'клиента';
        await this.notify({
            userId: recipientUserId,
            category: 'NEW_CHAT_MESSAGE',
            title: 'Новое сообщение',
            message: `Новое сообщение от ${data.senderName || senderLabel}`,
            metadata: data,
        });
    }
    async notifySubscriptionExpiring(masterUserId, data) {
        const days = data.daysLeft;
        const suffix = days === 1 ? 'день' : 'дня';
        await this.notify({
            userId: masterUserId,
            category: 'SUBSCRIPTION_EXPIRING',
            title: 'Подписка истекает',
            message: `Ваш тариф ${data.tariffType} истекает через ${days} ${suffix}`,
            metadata: {
                ...data,
                expiresAt: data.expiresAt instanceof Date
                    ? data.expiresAt.toISOString()
                    : data.expiresAt,
            },
            priority: 'high',
        });
    }
    async notifySubscriptionExpired(masterUserId, data) {
        await this.notify({
            userId: masterUserId,
            category: 'SUBSCRIPTION_EXPIRED',
            title: 'Подписка истекла',
            message: `Ваш тариф ${data.tariffType} истёк. Текущий тариф: BASIC`,
            metadata: data,
            priority: 'high',
        });
    }
    async notifyPaymentSuccess(userId, data) {
        await this.notify({
            userId,
            category: 'PAYMENT_SUCCESS',
            title: 'Оплата успешна',
            message: `Оплата тарифа ${data.tariffType} прошла успешно`,
            metadata: data,
        });
        await this.notifyAdmins({
            category: 'ADMIN_NEW_PAYMENT',
            title: 'Новый платёж',
            message: `Оплата тарифа ${data.tariffType}: ${data.amount}`,
            metadata: data,
        });
    }
    async notifyPaymentFailed(userId, data) {
        await this.notify({
            userId,
            category: 'PAYMENT_FAILED',
            title: 'Ошибка оплаты',
            message: `Оплата тарифа ${data.tariffType} не прошла`,
            metadata: data,
        });
    }
    async notifyNewVerificationRequest(data) {
        await this.notifyAdmins({
            category: 'ADMIN_NEW_VERIFICATION',
            title: 'Запрос на верификацию',
            message: `Мастер ${data.masterName || data.masterId.slice(0, 8)} подал заявку на верификацию`,
            metadata: data,
        });
    }
    async notifyVerificationApproved(masterUserId, data) {
        await this.notify({
            userId: masterUserId,
            category: 'VERIFICATION_APPROVED',
            title: 'Верификация одобрена',
            message: 'Ваш профиль успешно верифицирован! ✅',
            metadata: data,
            priority: 'high',
        });
    }
    async notifyVerificationRejected(masterUserId, data) {
        await this.notify({
            userId: masterUserId,
            category: 'VERIFICATION_REJECTED',
            title: 'Верификация отклонена',
            message: data.reason
                ? `Верификация отклонена: ${data.reason}`
                : 'Верификация отклонена. Проверьте документы и отправьте повторно.',
            metadata: data,
            priority: 'high',
        });
    }
    async notifyNewReport(data) {
        await this.notifyAdmins({
            category: 'ADMIN_NEW_REPORT',
            title: 'Новая жалоба',
            message: `Жалоба: ${data.reason}`,
            metadata: data,
        });
    }
    async notifyNewRegistration(data) {
        const category = data.role === 'MASTER' ? 'ADMIN_NEW_MASTER' : 'ADMIN_NEW_USER';
        const label = data.role === 'MASTER' ? 'мастер' : 'пользователь';
        await this.notifyAdmins({
            category: category,
            title: `Новый ${label}`,
            message: `Зарегистрирован ${label}: ${data.name || data.userId.slice(0, 8)}`,
            metadata: data,
        });
    }
    async notifySystemAlert(data) {
        await this.notifyAdmins({
            category: 'ADMIN_SYSTEM_ALERT',
            title: 'Системное уведомление',
            message: data.message,
            metadata: data,
        });
    }
    async notifyLeadSentToClient(clientUserId, data) {
        await this.notify({
            userId: clientUserId,
            category: 'LEAD_SENT',
            title: 'Заявка отправлена',
            message: `Заявка отправлена мастеру ${data.masterName}`,
            metadata: data,
        });
    }
    async notifyMasterAvailable(clientUserId, data) {
        const name = data.masterName || 'Мастер';
        await this.notify({
            userId: clientUserId,
            category: 'MASTER_AVAILABLE',
            title: 'Мастер доступен',
            message: `${name} снова принимает заявки. Можете отправить заявку.`,
            metadata: data,
            priority: 'high',
        });
    }
    async notifyNewPromotion(clientUserId, data) {
        await this.notify({
            userId: clientUserId,
            category: 'NEW_PROMOTION',
            title: 'Новая акция! 🔥',
            message: `Мастер ${data.masterName} запустил акцию: -${data.discount}%! Успейте записаться.`,
            metadata: data,
            priority: 'high',
        });
    }
    async notifyBookingConfirmed(masterUserId, clientUserId, data) {
        const clientLabel = data.clientName || 'Клиент';
        const masterLabel = data.masterName || 'Мастер';
        await this.notify({
            userId: masterUserId,
            category: 'BOOKING_CONFIRMED',
            title: 'Новая запись',
            message: `${clientLabel} записался на ${data.startTime}`,
            metadata: data,
            priority: 'high',
        });
        if (clientUserId) {
            await this.notify({
                userId: clientUserId,
                category: 'BOOKING_CONFIRMED',
                title: 'Запись подтверждена',
                message: `Вы записаны к ${masterLabel} на ${data.startTime}`,
                metadata: data,
            });
        }
    }
    async notifyBookingCancelled(masterUserId, clientUserId, data) {
        const clientLabel = data.clientName || 'Клиент';
        const masterLabel = data.masterName || 'Мастер';
        await this.notify({
            userId: masterUserId,
            category: 'BOOKING_CANCELLED',
            title: 'Запись отменена',
            message: `Запись с ${clientLabel} на ${data.startTime} отменена`,
            metadata: data,
        });
        if (clientUserId) {
            await this.notify({
                userId: clientUserId,
                category: 'BOOKING_CANCELLED',
                title: 'Запись отменена',
                message: `Запись к ${masterLabel} на ${data.startTime} отменена`,
                metadata: data,
            });
        }
    }
    categoryToEventType(category) {
        const map = {
            NEW_LEAD: 'new_lead',
            LEAD_STATUS_UPDATED: 'lead_status_updated',
            NEW_REVIEW: 'new_review',
            NEW_CHAT_MESSAGE: 'new_chat_message',
            LEAD_SENT: 'lead_sent',
            SUBSCRIPTION_EXPIRING: 'subscription_expiring',
            SUBSCRIPTION_EXPIRED: 'subscription_expired',
            PAYMENT_SUCCESS: 'payment_success',
            PAYMENT_FAILED: 'payment_failed',
            VERIFICATION_APPROVED: 'verification_approved',
            VERIFICATION_REJECTED: 'verification_rejected',
            ADMIN_NEW_VERIFICATION: 'admin_new_verification',
            ADMIN_NEW_REPORT: 'admin_new_report',
            ADMIN_NEW_USER: 'admin_new_user',
            ADMIN_NEW_MASTER: 'admin_new_master',
            ADMIN_SYSTEM_ALERT: 'admin_system_alert',
            ADMIN_NEW_LEAD: 'admin_new_lead',
            ADMIN_NEW_REVIEW: 'admin_new_review',
            ADMIN_NEW_PAYMENT: 'admin_new_payment',
            MASTER_RESPONDED: 'master_responded',
            MASTER_AVAILABLE: 'master_available',
            BOOKING_CONFIRMED: 'booking_confirmed',
            BOOKING_CANCELLED: 'booking_cancelled',
            BOOKING_REMINDER: 'booking_reminder',
            NEW_PROMOTION: 'new_promotion',
            PROMOTION_STARTED: 'promotion_started',
            SYSTEM_MAINTENANCE: 'system_maintenance',
            SYSTEM_UPDATE: 'system_update',
        };
        return map[category] ?? category.toLowerCase();
    }
};
exports.InAppNotificationService = InAppNotificationService;
exports.InAppNotificationService = InAppNotificationService = InAppNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        websocket_service_1.WebsocketService])
], InAppNotificationService);
//# sourceMappingURL=in-app-notification.service.js.map