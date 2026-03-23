import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  buildCreatedAtIdCursorWhereDesc,
  decodeCreatedAtIdCursor,
  nextCursorFromLastCreatedAtId,
} from '../../../shared/pagination/createdAtIdCursor';

export type AdminPaymentsStats = {
  total: number;
  pendingCount: number;
  paidCount: number;
  failedCount: number;
  totalRevenue: number;
};

/**
 * Сервис для управления платежами в админке
 */
@Injectable()
export class AdminPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private getPaymentInclude(): Prisma.PaymentInclude {
    return {
      master: {
        select: {
          avatarFile: { select: { path: true } },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              avatarFile: { select: { path: true } },
            },
          },
        },
      },
      user: {
        select: {
          email: true,
          phone: true,
        },
      },
    };
  }

  async getPaymentsStats(): Promise<AdminPaymentsStats> {
    const [total, pendingCount, paidCount, failedCount, revenueAgg] =
      await Promise.all([
        this.prisma.payment.count(),
        this.prisma.payment.count({
          where: { status: PaymentStatus.PENDING },
        }),
        this.prisma.payment.count({
          where: { status: PaymentStatus.SUCCESS },
        }),
        this.prisma.payment.count({
          where: { status: PaymentStatus.FAILED },
        }),
        this.prisma.payment.aggregate({
          where: { status: PaymentStatus.SUCCESS },
          _sum: { amount: true },
        }),
      ]);

    const totalRevenue = revenueAgg._sum.amount
      ? Number(revenueAgg._sum.amount)
      : 0;

    return {
      total,
      pendingCount,
      paidCount,
      failedCount,
      totalRevenue,
    };
  }

  async getPaymentsExport(filters?: { status?: string }) {
    const where: Prisma.PaymentWhereInput = {};
    if (filters?.status) where.status = filters.status as PaymentStatus;

    const payments = await this.prisma.payment.findMany({
      where,
      include: this.getPaymentInclude(),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return { payments };
  }

  async getPayments(filters?: {
    status?: string;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    const { status, page = 1, limit = 50, cursor } = filters ?? {};
    const limitNumber = Number(limit) || 50;

    const where: Prisma.PaymentWhereInput = {};
    if (status) where.status = status as PaymentStatus;

    const cursorDecoded = decodeCreatedAtIdCursor(cursor);
    const useCursor = Boolean(cursor && cursorDecoded);
    const whereWithCursor: Prisma.PaymentWhereInput = useCursor
      ? (buildCreatedAtIdCursorWhereDesc(
          where as Record<string, unknown>,
          cursorDecoded!,
        ) as Prisma.PaymentWhereInput)
      : where;

    const orderBy: Prisma.PaymentOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
      { id: 'desc' },
    ];

    const [rawPayments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: whereWithCursor,
        include: this.getPaymentInclude(),
        orderBy,
        ...(useCursor
          ? { take: limitNumber + 1 }
          : { skip: (Number(page) - 1) * limitNumber, take: limitNumber }),
      }),
      this.prisma.payment.count({ where }),
    ]);

    const payments = useCursor
      ? rawPayments.slice(0, limitNumber)
      : rawPayments;
    const nextCursor =
      useCursor && rawPayments.length > limitNumber
        ? nextCursorFromLastCreatedAtId(payments)
        : null;

    return {
      payments,
      pagination: {
        total,
        page: useCursor ? 1 : page,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        nextCursor,
      },
    };
  }

  async getRecentPayments(limit: number = 10) {
    return this.prisma.payment.findMany({
      include: this.getPaymentInclude(),
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
