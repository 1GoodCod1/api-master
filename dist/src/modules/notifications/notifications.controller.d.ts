import { NotificationsService } from './notifications.service';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getNotifications(user: JwtUser, page?: string, limit?: string, cursor?: string, unreadOnly?: string, category?: string, type?: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
        }[];
        meta: import("../shared/pagination/cursor-pagination").PaginationMeta;
    }>;
    getUnreadCount(user: JwtUser): Promise<{
        count: number;
        byCategory: Record<string, number>;
    }>;
    markAsRead(user: JwtUser, id: string): Promise<{
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
    markAllAsRead(user: JwtUser): Promise<{
        updated: number;
    }>;
    deleteNotification(user: JwtUser, id: string): Promise<{
        deleted: boolean;
    }>;
    deleteAllNotifications(user: JwtUser): Promise<{
        deleted: number;
    }>;
}
