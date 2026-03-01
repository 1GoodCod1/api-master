import { Injectable } from '@nestjs/common';
import { PaymentStatus, ReviewStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { decimalToNumber } from '../../shared/utils/decimal.utils';
import {
  BusinessAnalyticsResponse,
  DailyStat,
  CategoryStat,
  CityStat,
} from '../../shared/types/analytics.types';

@Injectable()
export class AnalyticsBusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async getBusinessAnalytics(
    days: number = 30,
  ): Promise<BusinessAnalyticsResponse> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalMasters,
      totalUsers,
      totalLeads,
      totalReviews,
      totalRevenue,
      dailyStats,
      categoryStats,
      cityStats,
    ] = await Promise.all([
      this.prisma.master.count({ where: { createdAt: { gte: startDate } } }),
      this.prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      this.prisma.lead.count({ where: { createdAt: { gte: startDate } } }),
      this.prisma.review.count({
        where: { createdAt: { gte: startDate }, status: ReviewStatus.VISIBLE },
      }),
      this.prisma.payment.aggregate({
        where: { createdAt: { gte: startDate }, status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
      this.getDailyStats(days),
      this.getCategoryStats(),
      this.getCityStats(),
    ]);

    return {
      period: `${days} days`,
      totals: {
        masters: totalMasters,
        users: totalUsers,
        leads: totalLeads,
        reviews: totalReviews,
        revenue: decimalToNumber(totalRevenue._sum.amount),
      },
      dailyStats,
      categoryStats,
      cityStats,
    };
  }

  private async getDailyStats(days: number): Promise<DailyStat[]> {
    const stats: DailyStat[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [leads, reviews, payments] = await Promise.all([
        this.prisma.lead.count({
          where: { createdAt: { gte: date, lt: nextDate } },
        }),
        this.prisma.review.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
            status: ReviewStatus.VISIBLE,
          },
        }),
        this.prisma.payment.aggregate({
          where: {
            createdAt: { gte: date, lt: nextDate },
            status: PaymentStatus.SUCCESS,
          },
          _sum: { amount: true },
        }),
      ]);

      stats.push({
        date: date.toISOString().split('T')[0],
        leads,
        reviews,
        revenue: decimalToNumber(payments._sum.amount),
      });
    }
    return stats;
  }

  private async getCategoryStats(): Promise<CategoryStat[]> {
    const categories = await this.prisma.category.findMany({
      include: {
        _count: { select: { masters: true } },
        masters: { select: { rating: true, leadsCount: true } },
      },
      orderBy: { masters: { _count: 'desc' } },
      take: 10,
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      mastersCount: category._count.masters,
      avgRating:
        category.masters.length > 0
          ? category.masters.reduce(
              (sum, m) => sum + decimalToNumber(m.rating),
              0,
            ) / category.masters.length
          : 0,
      totalLeads: category.masters.reduce((sum, m) => sum + m.leadsCount, 0),
    }));
  }

  private async getCityStats(): Promise<CityStat[]> {
    const cities = await this.prisma.city.findMany({
      include: {
        _count: { select: { masters: true } },
        masters: { select: { rating: true, leadsCount: true } },
      },
      orderBy: { masters: { _count: 'desc' } },
      take: 10,
    });

    return cities.map((city) => ({
      id: city.id,
      name: city.name,
      mastersCount: city._count.masters,
      avgRating:
        city.masters.length > 0
          ? city.masters.reduce(
              (sum, m) => sum + decimalToNumber(m.rating),
              0,
            ) / city.masters.length
          : 0,
      totalLeads: city.masters.reduce((sum, m) => sum + m.leadsCount, 0),
    }));
  }
}
