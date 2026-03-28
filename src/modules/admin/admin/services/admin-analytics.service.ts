import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_DESC } from '../../../../common/constants';
import {
  getStartOfDateInMoldova,
  getStartOfTodayInMoldova,
  toDateStringMoldova,
} from '../../../shared/utils/timezone.util';
import {
  ANALYTICS_TIMEFRAME,
  type AnalyticsTimeframe,
} from '../../../../common/constants';

/**
 * Сервис для аналитики и статистики
 */
@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(timeframe: AnalyticsTimeframe = ANALYTICS_TIMEFRAME.DAY) {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case ANALYTICS_TIMEFRAME.DAY:
        startDate = getStartOfDateInMoldova(
          new Date(now.getTime() - 24 * 60 * 60 * 1000),
        );
        break;
      case ANALYTICS_TIMEFRAME.WEEK:
        startDate = getStartOfDateInMoldova(
          new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        );
        break;
      case ANALYTICS_TIMEFRAME.MONTH:
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate = getStartOfDateInMoldova(startDate);
        break;
    }

    const [
      databaseStats,
      newUsersInPeriod,
      newLeadsInPeriod,
      newReviewsInPeriod,
      usersByDay,
      leadsByDay,
      reviewsByDay,
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
      this.getDailyStats('User', startDate),
      this.getDailyStats('Lead', startDate),
      this.getDailyStats('Review', startDate),
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
        },
      },
      users: usersByDay,
      leads: leadsByDay,
      reviews: reviewsByDay,
      categories: categoryStats,
      cities: cityStats,
    };
  }

  private async getDailyStats(
    model: 'User' | 'Lead' | 'Review',
    startDate: Date,
  ) {
    const todayStart = getStartOfTodayInMoldova();
    const days = Math.ceil(
      (todayStart.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    const stats: Array<{ date: string; count: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = getStartOfDateInMoldova(
        new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000),
      );

      const nextDate = getStartOfDateInMoldova(
        new Date(date.getTime() + 24 * 60 * 60 * 1000),
      );

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
        date: toDateStringMoldova(date),
        count,
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
          _count: SORT_DESC,
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
          _count: SORT_DESC,
        },
      },
      take: 10,
    });
  }
}
