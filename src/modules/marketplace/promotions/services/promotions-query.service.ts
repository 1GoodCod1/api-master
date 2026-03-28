import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  SORT_ASC,
  SORT_DESC,
} from '../../../shared/constants/sort-order.constants';
import { CacheService } from '../../../shared/cache/cache.service';

/**
 * Сервис чтения акций.
 * Отвечает за: список акций мастера, публичные активные акции, активные по мастеру.
 */
@Injectable()
export class PromotionsQueryService {
  private readonly CACHE_TTL = 300; // 5 min

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Получить акции текущего мастера
   */
  async findMyPromotions(masterId: string) {
    return this.prisma.promotion.findMany({
      where: { masterId },
      orderBy: { createdAt: SORT_DESC },
    });
  }

  /**
   * Получить все активные акции (публичный эндпоинт для HomePage)
   */
  async findActivePromotions(limit = 10) {
    const cacheKey = `cache:promotions:active:limit:${limit}`;
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();
        return this.prisma.promotion.findMany({
          where: {
            isActive: true,
            validFrom: { lte: now },
            validUntil: { gte: now },
            master: { user: { isVerified: true } },
          },
          include: {
            master: {
              select: {
                id: true,
                slug: true,
                rating: true,
                totalReviews: true,
                avatarFileId: true,
                user: { select: { firstName: true, lastName: true } },
                city: { select: { name: true } },
                category: { select: { name: true } },
                photos: {
                  select: { file: { select: { path: true } } },
                  take: 1,
                  orderBy: { order: SORT_ASC },
                },
              },
            },
          },
          orderBy: { discount: SORT_DESC },
          take: limit,
        });
      },
      this.CACHE_TTL,
    );
  }

  /**
   * Получить все активные акции мастера (для страницы мастера).
   * Для неверифицированных мастеров возвращаем пустой массив.
   */
  async findActivePromotionsForMaster(masterId: string) {
    const cacheKey = `cache:promotions:master:${masterId}`;
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const master = await this.prisma.master.findUnique({
          where: { id: masterId },
          include: { user: { select: { isVerified: true } } },
        });
        if (!master || !(master.user as { isVerified?: boolean })?.isVerified) {
          return [];
        }

        const now = new Date();
        return this.prisma.promotion.findMany({
          where: {
            masterId,
            isActive: true,
            validFrom: { lte: now },
            validUntil: { gte: now },
          },
          orderBy: { discount: SORT_DESC },
        });
      },
      this.CACHE_TTL,
    );
  }
}
