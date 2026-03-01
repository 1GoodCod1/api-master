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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const notifications_query_service_1 = require("./services/notifications-query.service");
const notifications_action_service_1 = require("./services/notifications-action.service");
const notifications_sender_service_1 = require("./services/notifications-sender.service");
let NotificationsService = class NotificationsService {
    queryService;
    actionService;
    senderService;
    constructor(queryService, actionService, senderService) {
        this.queryService = queryService;
        this.actionService = actionService;
        this.senderService = senderService;
    }
    async getUserNotifications(userId, options) {
        return this.queryService.getUserNotifications(userId, options);
    }
    async getUnreadCount(userId) {
        return this.queryService.getUnreadCount(userId);
    }
    async markAsRead(userId, notificationId) {
        return this.actionService.markAsRead(userId, notificationId);
    }
    async markAllAsRead(userId) {
        return this.actionService.markAllAsRead(userId);
    }
    async deleteNotification(userId, notificationId) {
        return this.actionService.deleteNotification(userId, notificationId);
    }
    async deleteAllNotifications(userId) {
        return this.actionService.deleteAllNotifications(userId);
    }
    async sendSMS(to, message, options) {
        return this.senderService.sendSMS(to, message, options);
    }
    async sendTelegram(message, options) {
        return this.senderService.sendTelegram(message, options);
    }
    async sendLeadNotification(to, leadData, options) {
        return this.senderService.sendLeadNotification(to, leadData, options);
    }
    async sendPaymentConfirmation(to, paymentData) {
        return this.senderService.sendPaymentConfirmation(to, paymentData);
    }
    async processSMSJob(job) {
        return this.senderService.processSMSJob(job);
    }
    async processTelegramJob(job) {
        return this.senderService.processTelegramJob(job);
    }
    async saveNotification(params) {
        return this.actionService.saveNotification(params);
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notifications_query_service_1.NotificationsQueryService,
        notifications_action_service_1.NotificationsActionService,
        notifications_sender_service_1.NotificationsSenderService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map