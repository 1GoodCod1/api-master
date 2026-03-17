import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  buildCreatedAtIdCursorWhereDesc,
  decodeCreatedAtIdCursor,
  nextCursorFromLastCreatedAtId,
} from '../../../shared/pagination/createdAtIdCursor';

/**
 * Сервис для управления платежами в админке
 */
@Injectable()
export class AdminPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPayments(filters?: {
    status?: string;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    const { status, page = 1, limit = 50, cursor } = filters || {};
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
}
