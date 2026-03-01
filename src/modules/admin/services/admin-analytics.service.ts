import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';

/**
 * Сервис для аналитики и статистики
 */
@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(timeframe: 'day' | 'week' | 'month' = 'day') {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'day':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const [
      databaseStats,
      newUsersInPeriod,
      newLeadsInPeriod,
      newReviewsInPeriod,
      revenueInPeriod,
      usersByDay,
      leadsByDay,
      reviewsByDay,
      revenueByDay,
      categoryStats,
      cityStats,
    ] = await Promise.all([
      Promise.all([
        this.prisma.user.count(),
        this.prisma.master.count(),
        this.prisma.lead.count(),
        this.prisma.review.count(),
        this.prisma.payment.count(),
      ]).then(
        ([
          totalUsers,
          totalMasters,
          totalLeads,
          totalReviews,
          totalPayments,
        ]) => ({
          totalUsers,
          totalMasters,
          totalLeads,
          totalReviews,
          totalPayments,
        }),
      ),
      this.prisma.user.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.lead.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.review.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.payment
        .aggregate({
          where: {
            createdAt: { gte: startDate },
            status: PaymentStatus.SUCCESS,
          },
          _sum: { amount: true },
        })
        .then((result) => Number(result._sum.amount) || 0),
      this.getDailyStats('User', startDate),
      this.getDailyStats('Lead', startDate),
      this.getDailyStats('Review', startDate),
      this.getDailyRevenueStats(startDate),
      this.getCategoryStats(),
      this.getCityStats(),
    ]);

    return {
      timeframe,
      stats: {
        database: databaseStats,
        daily: {
          newUsers: newUsersInPeriod,
          newLeads: newLeadsInPeriod,
          newReviews: newReviewsInPeriod,
          revenue: revenueInPeriod,
        },
      },
      users: usersByDay,
      leads: leadsByDay,
      reviews: reviewsByDay,
      revenue: revenueByDay,
      categories: categoryStats,
      cities: cityStats,
    };
  }

  private async getDailyStats(
    model: 'User' | 'Lead' | 'Review',
    startDate: Date,
  ) {
    const days = Math.ceil(
      (Date.now() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    const stats: Array<{ date: string; count: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      let count = 0;
      switch (model) {
        case 'User':
          count = await this.prisma.user.count({
            where: { createdAt: { gte: date, lt: nextDate } },
          });
          break;
        case 'Lead':
          count = await this.prisma.lead.count({
            where: { createdAt: { gte: date, lt: nextDate } },
          });
          break;
        case 'Review':
          count = await this.prisma.review.count({
            where: { createdAt: { gte: date, lt: nextDate } },
          });
          break;
      }

      stats.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }

    return stats;
  }

  private async getDailyRevenueStats(startDate: Date) {
    const days = Math.ceil(
      (Date.now() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    const stats: Array<{ date: string; revenue: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const revenue = await this.prisma.payment.aggregate({
        where: {
          createdAt: { gte: date, lt: nextDate },
          status: PaymentStatus.SUCCESS,
        },
        _sum: { amount: true },
      });

      stats.push({
        date: date.toISOString().split('T')[0],
        revenue: Number(revenue._sum.amount) || 0,
      });
    }

    return stats;
  }

  private async getCategoryStats() {
    return this.prisma.category.findMany({
      include: {
        _count: {
          select: { masters: true },
        },
        masters: {
          select: {
            rating: true,
            leadsCount: true,
          },
        },
      },
      orderBy: {
        masters: {
          _count: 'desc',
        },
      },
      take: 10,
    });
  }

  private async getCityStats() {
    return this.prisma.city.findMany({
      include: {
        _count: {
          select: { masters: true },
        },
        masters: {
          select: {
            rating: true,
            leadsCount: true,
          },
        },
      },
      orderBy: {
        masters: {
          _count: 'desc',
        },
      },
      take: 10,
    });
  }
}
