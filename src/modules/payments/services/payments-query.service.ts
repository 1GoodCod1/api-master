import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class PaymentsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getPaymentsForMaster(masterId: string) {
    return this.prisma.payment.findMany({
      where: { masterId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPaymentStats(masterId: string) {
    const [totalPayments, totalRevenue, recentPayments] = await Promise.all([
      this.prisma.payment.count({
        where: { masterId, status: PaymentStatus.SUCCESS },
      }),
      this.prisma.payment.aggregate({
        where: { masterId, status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: { masterId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalPayments,
      totalRevenue: totalRevenue._sum.amount ?? 0,
      recentPayments,
    };
  }
}
