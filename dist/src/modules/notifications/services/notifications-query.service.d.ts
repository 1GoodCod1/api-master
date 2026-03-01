import { PrismaService } from '../../shared/database/prisma.service';
import type { NotificationCategory, NotificationType } from '@prisma/client';
export declare class NotificationsQueryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
        meta: import("../../shared/pagination/cursor-pagination").PaginationMeta;
    }>;
    getUnreadCount(userId: string): Promise<{
        count: number;
        byCategory: Record<string, number>;
    }>;
}
