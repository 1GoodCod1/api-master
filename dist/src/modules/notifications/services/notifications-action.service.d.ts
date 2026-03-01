import { PrismaService } from '../../shared/database/prisma.service';
import { NotificationType, NotificationStatus } from '@prisma/client';
export interface SaveNotificationParams {
    type: NotificationType;
    recipient: string;
    message: string;
    status: NotificationStatus;
    metadata?: Record<string, any>;
    title?: string;
    userId?: string;
}
export declare class NotificationsActionService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
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
    deleteNotification(userId: string, notificationId: string): Promise<{
        deleted: boolean;
    }>;
    deleteAllNotifications(userId: string): Promise<{
        deleted: number;
    }>;
}
