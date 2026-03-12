import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LeadStatus, ReviewStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import {
  buildCursorQuery,
  buildPaginatedResponse,
  type PaginatedResult,
} from '../../shared/pagination/cursor-pagination';

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
      sortOrder = 'desc',
    } = options;

    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));

    // Cache key includes all pagination params for correct invalidation
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
              // Replies inlined (typically 0-1 — master reply)
              replies: true,
              // Use _count instead of loading all votes to avoid N+1
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
        // Status distribution + rating distribution in parallel
        const [statusGroups, ratingStats] = await Promise.all([
          // Single groupBy for all status counts instead of 4-5 separate count() calls
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

        // Build status counts from single query
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
    // Use parallel count queries instead of fetching full objects
    const [existingCount, closedLead] = await Promise.all([
      this.prisma.review.count({
        where: { masterId, clientId },
      }),
      this.prisma.lead.findFirst({
        where: { masterId, clientId, status: LeadStatus.CLOSED },
        select: { id: true },
      }),
    ]);

    if (existingCount > 0) return { canCreate: false, alreadyReviewed: true };
    if (!closedLead) return { canCreate: false, noClosedLead: true };

    return { canCreate: true, leadId: closedLead.id };
  }
}
