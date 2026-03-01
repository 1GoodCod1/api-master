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
var NotificationsActionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsActionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const client_1 = require("@prisma/client");
let NotificationsActionService = NotificationsActionService_1 = class NotificationsActionService {
    prisma;
    logger = new common_1.Logger(NotificationsActionService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async markAsRead(userId, notificationId) {
        const notification = await this.prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Уведомление не найдено');
        }
        if (notification.readAt) {
            return notification;
        }
        return this.prisma.notification.update({
            where: { id: notificationId },
            data: { readAt: new Date() },
        });
    }
    async markAllAsRead(userId) {
        const result = await this.prisma.notification.updateMany({
            where: {
                userId,
                readAt: null,
            },
            data: {
                readAt: new Date(),
            },
        });
        return { updated: result.count };
    }
    async saveNotification(params) {
        try {
            const userId = params.userId ?? null;
            const metadata = {
                ...(params.metadata || {}),
                ...(params.recipient ? { recipient: params.recipient } : {}),
            };
            const hasMetadata = Object.keys(metadata).length > 0;
            return await this.prisma.notification.create({
                data: {
                    type: params.type,
                    title: params.title || params.type.toUpperCase(),
                    message: params.message,
                    status: params.status,
                    sentAt: params.status === client_1.NotificationStatus.SENT ? new Date() : null,
                    ...(hasMetadata ? { metadata } : {}),
                    userId,
                },
            });
        }
        catch (error) {
            this.logger.error('Ошибка при сохранении уведомления в БД:', error);
            throw error;
        }
    }
    async deleteNotification(userId, notificationId) {
        const notification = await this.prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Уведомление не найдено');
        }
        await this.prisma.notification.delete({
            where: { id: notificationId },
        });
        return { deleted: true };
    }
    async deleteAllNotifications(userId) {
        const result = await this.prisma.notification.deleteMany({
            where: { userId },
        });
        return { deleted: result.count };
    }
};
exports.NotificationsActionService = NotificationsActionService;
exports.NotificationsActionService = NotificationsActionService = NotificationsActionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsActionService);
//# sourceMappingURL=notifications-action.service.js.map