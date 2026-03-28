import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_DESC } from '../../../shared/constants/sort-order.constants';

@Injectable()
export class RecommendationsHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получить список недавно просмотренных мастеров
   * @param userId ID пользователя
   * @param sessionId ID сессии
   * @param limit Количество записей
   */
  async getRecentlyViewed(
    userId?: string,
    sessionId?: string,
    limit: number = 10,
  ) {
    const or: Array<{ userId?: string } | { sessionId?: string }> = [];
    if (userId) or.push({ userId });
    if (sessionId) or.push({ sessionId });
    if (or.length === 0) return [];

    const activities = await this.prisma.userActivity.findMany({
      where: {
        OR: or,
        action: 'view',
        masterId: { not: null },
      },
      orderBy: { createdAt: SORT_DESC },
      take: limit * 2, // Берем с запасом для фильтрации уникальных
      distinct: ['masterId'],
    });

    const masterIds = activities
      .map((a) => a.masterId)
      .filter(Boolean) as string[];
    if (masterIds.length === 0) return [];

    const masters = await this.prisma.master.findMany({
      where: {
        id: { in: masterIds },
        user: { isBanned: false },
      },
      include: {
        category: true,
        city: true,
        user: { select: { id: true, isVerified: true } },
        photos: { take: 1, include: { file: true } },
      },
    });

    // Возвращаем в порядке просмотра
    return masterIds
      .map((id) => masters.find((m) => m.id === id))
      .filter(Boolean)
      .slice(0, limit);
  }
}
