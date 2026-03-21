import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LeadStatus,
  PaymentStatus,
  Prisma,
  ReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';

/**
 * Сервис для управления контентом: лиды, отзывы, платежи
 */
@Injectable()
export class AdminContentService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== ЛИДЫ ====================

  async getLeads(filters?: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const { status, dateFrom, dateTo, page = 1, limit = 50 } = filters ?? {};
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {};
    if (status) where.status = status as LeadStatus;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          master: {
            select: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      leads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRecentLeads(limit: number = 10) {
    return this.prisma.lead.findMany({
      include: {
        master: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ==================== ОТЗЫВЫ ====================

  async getReviews(filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 50 } = filters ?? {};
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};
    if (status) where.status = status as ReviewStatus;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async moderateReview(reviewId: string, status: string, reason?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    void reason; // Reserved for future moderation reason field
    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status: status as ReviewStatus,
        moderatedBy: 'admin',
        moderatedAt: new Date(),
      },
    });
  }

  // ==================== ПЛАТЕЖИ ====================

  async getPayments(filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 50 } = filters ?? {};
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};
    if (status) where.status = status as PaymentStatus;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          master: {
            select: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          user: {
            select: {
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRecentPayments(limit: number = 10) {
    return this.prisma.payment.findMany({
      include: {
        master: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ==================== АКТИВНОСТЬ ====================

  async getRecentActivity(limit: number = 20) {
    return this.prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
