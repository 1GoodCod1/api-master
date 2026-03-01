import { Job } from 'bull';
import { NotificationsQueryService } from './services/notifications-query.service';
import { NotificationsActionService, SaveNotificationParams } from './services/notifications-action.service';
import { NotificationsSenderService, type LeadNotificationData, type PaymentConfirmationData } from './services/notifications-sender.service';
import { SMSJobData, TelegramJobData } from '../shared/types/notification.types';
import type { NotificationCategory, NotificationType } from '@prisma/client';
export declare class NotificationsService {
    private readonly queryService;
    private readonly actionService;
    private readonly senderService;
    constructor(queryService: NotificationsQueryService, actionService: NotificationsActionService, senderService: NotificationsSenderService);
    getUserNotifications(userId: string, options: {
        page?: number;
        limit?: number;
        cursor?: string;
        unreadOnly?: boolean;
        category?: NotificationCategory;
        type?: NotificationType;
    }): Promise<{
        data: {
            id: string;
            createdAt: Date;
        }[];
        meta: import("../shared/pagination/cursor-pagination").PaginationMeta;
    }>;
    getUnreadCount(userId: string): Promise<{
        count: number;
        byCategory: Record<string, number>;
    }>;
    markAsRead(userId: string, notificationId: string): Promise<{
        id: string;
        createdAt: Date;
        category: import("@prisma/client").$Enums.NotificationCategory | null;
        type: import("@prisma/client").$Enums.NotificationType;
        message: string;
        userId: string | null;
        status: import("@prisma/client").$Enums.NotificationStatus;
        title: string | null;
        metadata: import(".prisma/client/runtime/client").JsonValue | null;
        sentAt: Date | null;
        readAt: Date | null;
    }>;
    markAllAsRead(userId: string): Promise<{
        updated: number;
    }>;
    deleteNotification(userId: string, notificationId: string): Promise<{
        deleted: boolean;
    }>;
    deleteAllNotifications(userId: string): Promise<{
        deleted: number;
    }>;
    sendSMS(to: string, message: string, options?: Record<string, unknown>): Promise<void>;
    sendTelegram(message: string, options?: {
        chatId?: string;
        silent?: boolean;
    }): Promise<void>;
    sendLeadNotification(to: string, leadData: LeadNotificationData, options?: {
        telegramChatId?: string;
        whatsappPhone?: string;
    }): Promise<void>;
    sendPaymentConfirmation(to: string, paymentData: PaymentConfirmationData): Promise<void>;
    processSMSJob(job: Job<SMSJobData>): Promise<void>;
    processTelegramJob(job: Job<TelegramJobData>): Promise<void>;
    saveNotification(params: SaveNotificationParams): Promise<{
        id: string;
        createdAt: Date;
        category: import("@prisma/client").$Enums.NotificationCategory | null;
        type: import("@prisma/client").$Enums.NotificationType;
        message: string;
        userId: string | null;
        status: import("@prisma/client").$Enums.NotificationStatus;
        title: string | null;
        metadata: import(".prisma/client/runtime/client").JsonValue | null;
        sentAt: Date | null;
        readAt: Date | null;
    }>;
}
