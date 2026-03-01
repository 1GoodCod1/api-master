import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import {
  buildCreatedAtIdCursorWhereDesc,
  decodeCreatedAtIdCursor,
  nextCursorFromLastCreatedAtId,
} from '../../shared/pagination/createdAtIdCursor';

/**
 * Сервис для управления отзывами в админке
 */
@Injectable()
export class AdminReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReviews(filters?: {
    status?: string;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    const { status, page = 1, limit = 50, cursor } = filters || {};
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
      { createdAt: 'desc' },
      { id: 'desc' },
    ];

    const [rawReviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: whereWithCursor,
        include: {
          master: {
            select: {
              user: { select: { firstName: true, lastName: true } },
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

  async moderateReview(reviewId: string, status: string, _reason?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status: status as ReviewStatus,
        moderatedBy: 'admin',
        moderatedAt: new Date(),
      },
    });
  }
}
