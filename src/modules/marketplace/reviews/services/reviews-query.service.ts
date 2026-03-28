import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LeadStatus, ReviewStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_DESC } from '../../../../common/constants';
import { CacheService } from '../../../shared/cache/cache.service';
import {
  buildCursorQuery,
  buildPaginatedResponse,
  type PaginatedResult,
} from '../../../shared/pagination/cursor-pagination';

@Injectable()
export class ReviewsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Получить список отзывов для конкретного мастера с cursor-based пагинацией.
   *
   * @param masterId ID мастера
   * @param options  Фильтры и пагинация
   */
  async findAllForMaster(
    masterId: string,
    options: {
      status?: string;
      statusIn?: ReviewStatus[];
      limit?: number;
      cursor?: string;
      page?: number;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ): Promise<PaginatedResult<unknown>> {
    const {
      status,
      statusIn,
      limit: rawLimit = 20,
      cursor,
      page,
      sortOrder = SORT_DESC,
    } = options;

    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));

    // Ключ кеша включает все параметры пагинации для корректной инвалидации
    const statusKey = statusIn ? statusIn.join(',') : status;
    const cacheKey = this.cache.keys.masterReviews(
      masterId,
      page || 1,
      limit,
      statusKey,
    );

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const baseWhere: Prisma.ReviewWhereInput = { masterId };
        if (statusIn) {
          baseWhere.status = { in: statusIn };
        } else if (status) {
          baseWhere.status = status as ReviewStatus;
        }

        const queryParams = buildCursorQuery(
          baseWhere as Record<string, unknown>,
          cursor,
          page,
          limit,
          sortOrder,
        );

        const [rawReviews, total] = await Promise.all([
          this.prisma.review.findMany({
            where: queryParams.where as Prisma.ReviewWhereInput,
            orderBy:
              queryParams.orderBy as Prisma.ReviewOrderByWithRelationInput[],
            take: queryParams.take,
            skip: queryParams.skip,
            include: {
              master: {
                select: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
              client: { select: { firstName: true, lastName: true } },
              reviewCriteria: true,
              reviewFiles: {
                include: {
                  file: {
                    select: {
                      id: true,
                      path: true,
                      mimetype: true,
                      filename: true,
                    },
                  },
                },
              },
              // Ответы встроены (обычно 0–1 — ответ мастера)
              replies: true,
              // _count вместо загрузки всех голосов — без N+1
              _count: {
                select: { votes: true },
              },
            },
          }),
          this.prisma.review.count({
            where: baseWhere,
          }),
        ]);

        return buildPaginatedResponse(
          rawReviews as Array<{ id: string; createdAt: Date }>,
          total,
          limit,
          queryParams.usedCursor,
        );
      },
      this.cache.ttl.reviews,
    );
  }

  /**
   * Отзывы, оставленные авторизованным клиентом (по clientId), с пагинацией.
   */
  async findAllForClient(
    clientUserId: string,
    options: {
      status?: string;
      statusIn?: ReviewStatus[];
      limit?: number;
      cursor?: string;
      page?: number;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ): Promise<PaginatedResult<unknown>> {
    const {
      status,
      statusIn,
      limit: rawLimit = 20,
      cursor,
      page,
      sortOrder = SORT_DESC,
    } = options;

    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));

    const statusKey = statusIn ? statusIn.join(',') : status;
    const cacheKey = this.cache.keys.clientWrittenReviews(
      clientUserId,
      page || 1,
      limit,
      statusKey,
    );

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const baseWhere: Prisma.ReviewWhereInput = { clientId: clientUserId };
        if (statusIn) {
          baseWhere.status = { in: statusIn };
        } else if (status) {
          baseWhere.status = status as ReviewStatus;
        }

        const queryParams = buildCursorQuery(
          baseWhere as Record<string, unknown>,
          cursor,
          page,
          limit,
          sortOrder,
        );

        const [rawReviews, total] = await Promise.all([
          this.prisma.review.findMany({
            where: queryParams.where as Prisma.ReviewWhereInput,
            orderBy:
              queryParams.orderBy as Prisma.ReviewOrderByWithRelationInput[],
            take: queryParams.take,
            skip: queryParams.skip,
            include: {
              master: {
                select: {
                  id: true,
                  user: { select: { firstName: true, lastName: true } },
                },
              },
              client: { select: { firstName: true, lastName: true } },
              reviewCriteria: true,
              reviewFiles: {
                include: {
                  file: {
                    select: {
                      id: true,
                      path: true,
                      mimetype: true,
                      filename: true,
                    },
                  },
                },
              },
              replies: true,
              _count: {
                select: { votes: true },
              },
            },
          }),
          this.prisma.review.count({
            where: baseWhere,
          }),
        ]);

        return buildPaginatedResponse(
          rawReviews as Array<{ id: string; createdAt: Date }>,
          total,
          limit,
          queryParams.usedCursor,
        );
      },
      this.cache.ttl.reviews,
    );
  }

  /**
   * Получить расширенную статистику по отзывам и оценкам мастера.
   * Оптимизировано: единый groupBy вместо 5 отдельных count-запросов.
   */
  async getStats(masterId: string) {
    const cacheKey = this.cache.buildKey([
      'cache',
      'master',
      masterId,
      'reviews',
      'stats',
    ]);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Распределение по статусам и по оценкам — параллельно
        const [statusGroups, ratingStats] = await Promise.all([
          // Один groupBy по статусам вместо 4–5 отдельных count()
          this.prisma.review.groupBy({
            by: ['status'],
            where: { masterId },
            _count: true,
          }),
          this.prisma.review.groupBy({
            by: ['rating'],
            where: { masterId, status: ReviewStatus.VISIBLE },
            _count: true,
          }),
        ]);

        // Счётчики статусов из одного запроса
        const statusMap: Record<string, number> = {};
        let total = 0;
        for (const g of statusGroups) {
          statusMap[g.status] = g._count;
          total += g._count;
        }

        return {
          total,
          byStatus: {
            visible: statusMap[ReviewStatus.VISIBLE] || 0,
            pending: statusMap[ReviewStatus.PENDING] || 0,
            hidden: statusMap[ReviewStatus.HIDDEN] || 0,
            reported: statusMap[ReviewStatus.REPORTED] || 0,
          },
          ratingDistribution: ratingStats.reduce(
            (acc, curr) => {
              acc[curr.rating] = curr._count;
              return acc;
            },
            {} as Record<number, number>,
          ),
        };
      },
      this.cache.ttl.reviews,
    );
  }

  /**
   * Проверить, может ли клиент оставить отзыв (наличие закрытого заказа и отсутствие старого отзыва)
   */
  async canCreateReview(masterId: string, clientId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { phone: true },
    });
    if (!user?.phone?.trim()) {
      return { canCreate: false, noClosedLead: true };
    }

    const clientPhone = user.phone.trim();

    // Два count() параллельно вместо загрузки сущностей целиком
    const [existingCount, closedLead] = await Promise.all([
      this.prisma.review.count({
        where: { masterId, clientId },
      }),
      this.prisma.lead.findFirst({
        where: {
          masterId,
          status: LeadStatus.CLOSED,
          // Как в findAllForClient: лид может быть без clientId (гость), но с тем же телефоном
          OR: [{ clientId }, { clientPhone }],
        },
        select: { id: true },
        orderBy: { updatedAt: SORT_DESC },
      }),
    ]);

    if (existingCount > 0) return { canCreate: false, alreadyReviewed: true };
    if (!closedLead) return { canCreate: false, noClosedLead: true };

    return { canCreate: true, leadId: closedLead.id };
  }
}
