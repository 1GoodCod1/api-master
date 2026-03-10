import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class PaymentsQueryService {
  private readonly logger = new Logger(PaymentsQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получить список платежей мастера
   * @param masterId ID мастера
   */
  async getPaymentsForMaster(masterId: string) {
    try {
      return await this.prisma.payment.findMany({
        where: { masterId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.error('getPaymentsForMaster failed', err);
      throw err;
    }
  }

  /**
   * Получить статистику платежей мастера
   * @param masterId ID мастера
   */
  async getPaymentStats(masterId: string) {
    try {
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
        totalRevenue: totalRevenue._sum.amount || 0,
        recentPayments,
      };
    } catch (err) {
      this.logger.error('getPaymentStats failed', err);
      throw err;
    }
  }
}
