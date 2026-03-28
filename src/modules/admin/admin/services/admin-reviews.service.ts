import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import {
  buildCreatedAtIdCursorWhereDesc,
  decodeCreatedAtIdCursor,
  nextCursorFromLastCreatedAtId,
} from '../../../shared/pagination/createdAtIdCursor';
import {
  SORT_ASC,
  SORT_DESC,
} from '../../../shared/constants/sort-order.constants';

export type AdminReviewsStats = {
  total: number;
  pendingCount: number;
  visibleCount: number;
  hiddenCount: number;
  reportedCount: number;
};

/**
 * Сервис для управления отзывами в админке
 */
@Injectable()
export class AdminReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getReviews(filters?: {
    status?: string;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    const { status, page = 1, limit = 50, cursor } = filters ?? {};
    const limitNumber = Number(limit) || 50;

    const where: Prisma.ReviewWhereInput = {};
    if (status) where.status = status as ReviewStatus;

    const cursorDecoded = decodeCreatedAtIdCursor(cursor);
    const useCursor = Boolean(cursor && cursorDecoded);
    const whereWithCursor: Prisma.ReviewWhereInput = useCursor
      ? (buildCreatedAtIdCursorWhereDesc(
          where as Record<string, unknown>,
          cursorDecoded!,
        ) as Prisma.ReviewWhereInput)
      : where;

    const orderBy: Prisma.ReviewOrderByWithRelationInput[] = [
      { createdAt: SORT_DESC },
      { id: SORT_DESC },
    ];

    const [rawReviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: whereWithCursor,
        include: {
          client: {
            select: {
              avatarFile: { select: { path: true } },
              clientPhotos: {
                orderBy: { order: SORT_ASC },
                take: 1,
                select: { file: { select: { path: true } } },
              },
            },
          },
          master: {
            select: {
              id: true,
              slug: true,
              avatarFile: { select: { path: true } },
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatarFile: { select: { path: true } },
                },
              },
            },
          },
          reviewFiles: {
            include: {
              file: {
                select: {
                  id: true,
                  path: true,
                  filename: true,
                  mimetype: true,
                },
              },
            },
          },
        },
        orderBy,
        ...(useCursor
          ? { take: limitNumber + 1 }
          : { skip: (Number(page) - 1) * limitNumber, take: limitNumber }),
      }),
      this.prisma.review.count({ where }),
    ]);

    const reviews = useCursor ? rawReviews.slice(0, limitNumber) : rawReviews;
    const nextCursor =
      useCursor && rawReviews.length > limitNumber
        ? nextCursorFromLastCreatedAtId(reviews)
        : null;

    return {
      reviews,
      pagination: {
        total,
        page: useCursor ? 1 : page,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        nextCursor,
      },
    };
  }

  async getReviewsStats(): Promise<AdminReviewsStats> {
    const [total, pendingCount, visibleCount, hiddenCount, reportedCount] =
      await Promise.all([
        this.prisma.review.count(),
        this.prisma.review.count({
          where: { status: ReviewStatus.PENDING },
        }),
        this.prisma.review.count({
          where: { status: ReviewStatus.VISIBLE },
        }),
        this.prisma.review.count({
          where: { status: ReviewStatus.HIDDEN },
        }),
        this.prisma.review.count({
          where: { status: ReviewStatus.REPORTED },
        }),
      ]);

    return {
      total,
      pendingCount,
      visibleCount,
      hiddenCount,
      reportedCount,
    };
  }

  async getReviewsExport(filters?: { status?: string }) {
    const { status } = filters ?? {};
    const where: Prisma.ReviewWhereInput = {};
    if (status) where.status = status as ReviewStatus;

    const reviews = await this.prisma.review.findMany({
      where,
      include: {
        client: {
          select: {
            avatarFile: { select: { path: true } },
            clientPhotos: {
              orderBy: { order: SORT_ASC },
              take: 1,
              select: { file: { select: { path: true } } },
            },
          },
        },
        master: {
          select: {
            id: true,
            slug: true,
            avatarFile: { select: { path: true } },
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatarFile: { select: { path: true } },
              },
            },
          },
        },
        reviewFiles: {
          include: {
            file: {
              select: {
                id: true,
                path: true,
                filename: true,
                mimetype: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: SORT_DESC }, { id: SORT_DESC }],
    });

    return { reviews };
  }

  async moderateReview(reviewId: string, status?: string, _reason?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Default to VISIBLE when approving via "Moderate" (status not sent from frontend)
    const resolvedStatus = (status || 'VISIBLE') as ReviewStatus;

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status: resolvedStatus,
        moderatedBy: 'admin',
        moderatedAt: new Date(),
      },
    });

    // Invalidate reviews cache so master page shows updated data
    await this.cache.invalidateMasterRelated(review.masterId);

    if (resolvedStatus === ReviewStatus.VISIBLE) {
      await this.updateMasterRating(review.masterId);
    }

    return updated;
  }

  private async updateMasterRating(masterId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { masterId, status: ReviewStatus.VISIBLE },
    });

    if (reviews.length === 0) {
      await this.prisma.master.update({
        where: { id: masterId },
        data: { rating: 0, totalReviews: 0 },
      });
      return;
    }

    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await this.prisma.master.update({
      where: { id: masterId },
      data: {
        rating: avgRating,
        totalReviews: reviews.length,
      },
    });
  }
}
