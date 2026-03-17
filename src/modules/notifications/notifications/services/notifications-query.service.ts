import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import type {
  NotificationCategory,
  NotificationType,
  Prisma,
} from '@prisma/client';
import {
  buildCursorQuery,
  buildPaginatedResponse,
} from '../../../shared/pagination/cursor-pagination';

@Injectable()
export class NotificationsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получить список уведомлений пользователя с cursor-based пагинацией.
   */
  async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      cursor?: string;
      unreadOnly?: boolean;
      category?: NotificationCategory;
      type?: NotificationType;
    },
  ) {
    const {
      page,
      limit: rawLimit = 50,
      cursor,
      unreadOnly,
      category,
      type,
    } = options;

    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 50));

    const baseWhere: Prisma.NotificationWhereInput = { userId };
    if (unreadOnly) {
      baseWhere.readAt = null;
    }
    if (category) {
      baseWhere.category = category;
    }
    if (type) {
      baseWhere.type = type;
    }

    const queryParams = buildCursorQuery(
      baseWhere as Record<string, unknown>,
      cursor,
      page,
      limit,
    );

    const [rawNotifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: queryParams.where as Prisma.NotificationWhereInput,
        orderBy:
          queryParams.orderBy as Prisma.NotificationOrderByWithRelationInput[],
        take: queryParams.take,
        skip: queryParams.skip,
      }),
      this.prisma.notification.count({ where: baseWhere }),
    ]);

    const paginated = buildPaginatedResponse(
      rawNotifications as Array<{ id: string; createdAt: Date }>,
      total,
      limit,
      queryParams.usedCursor,
    );

    return {
      data: paginated.items,
      meta: paginated.meta,
    };
  }

  /**
   * Получить количество непрочитанных уведомлений
   */
  async getUnreadCount(userId: string) {
    const [total, byCategory] = await Promise.all([
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
      this.prisma.$queryRaw<Array<{ category: string; count: bigint }>>`
        SELECT category, COUNT(*) as count
        FROM notifications
        WHERE "userId" = ${userId} AND "readAt" IS NULL AND category IS NOT NULL
        GROUP BY category
      `,
    ]);

    const categoryCounts: Record<string, number> = {};
    for (const row of byCategory) {
      if (row.category) {
        categoryCounts[row.category] = Number(row.count);
      }
    }

    return { count: total, byCategory: categoryCounts };
  }
}
