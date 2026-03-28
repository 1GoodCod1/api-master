import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { SORT_ASC } from '../../shared/constants/sort-order.constants';
import { decimalToNumber } from '../../shared/utils/decimal.utils';
import {
  getDayInMoldova,
  getHourInMoldova,
  getStartOfTodayInMoldova,
  toDateStringMoldova,
} from '../../shared/utils/timezone.util';
import {
  MasterAnalyticsItem,
  FilledAnalyticsItem,
  AnalyticsSummary,
  MasterAnalyticsResponse,
  AdvancedAnalyticsResponse,
  ConversionMetrics,
  TrendAnalysis,
  ComparisonData,
  ForecastData,
} from '../../shared/types/analytics.types';

@Injectable()
export class AnalyticsMasterService {
  constructor(private readonly prisma: PrismaService) {}

  async getMasterAnalytics(
    masterId: string,
    days: number = 7,
  ): Promise<MasterAnalyticsResponse> {
    const todayStart = getStartOfTodayInMoldova();
    const startDate = new Date(
      todayStart.getTime() - days * 24 * 60 * 60 * 1000,
    );

    const [analytics, master] = await Promise.all([
      this.prisma.masterAnalytics.findMany({
        where: { masterId, date: { gte: startDate } },
        orderBy: { date: SORT_ASC },
      }),
      this.prisma.master.findUnique({
        where: { id: masterId },
        select: { rating: true, totalReviews: true },
      }),
    ]);

    const typedAnalytics: MasterAnalyticsItem[] = analytics.map((item) => ({
      date: item.date,
      leadsCount: item.leadsCount,
      viewsCount: item.viewsCount,
      reviewsCount: item.reviewsCount,
      rating: decimalToNumber(item.rating),
    }));

    const filledAnalytics = this.fillMissingDates(typedAnalytics, days);
    const dataWithToday = await this.augmentTodayWithRealtimeStats(
      masterId,
      filledAnalytics,
    );

    const summary = this.calculateSummary(dataWithToday);
    let masterRating = master?.rating ?? 0;
    let masterTotalReviews = master?.totalReviews ?? 0;

    // Fallback: если Master устарел (кроны не отработали), считаем из Review
    if (masterTotalReviews === 0 || masterRating === 0) {
      const realReviews = await this.prisma.review.aggregate({
        where: { masterId, status: 'VISIBLE' },
        _count: true,
        _avg: { rating: true },
      });
      if (realReviews._count > 0) {
        masterTotalReviews = realReviews._count;
        masterRating = Number(realReviews._avg.rating ?? 0);
      }
    }
    summary.masterRating = masterRating;
    summary.masterTotalReviews = masterTotalReviews;

    return {
      period: `${days} days`,
      data: dataWithToday.map((item) => ({
        date: item.date.toISOString().split('T')[0],
        leadsCount: item.leadsCount,
        viewsCount: item.viewsCount,
        reviewsCount: item.reviewsCount,
        rating: item.rating,
      })),
      summary,
    };
  }

  /**
   * Augments today's analytics with real-time counts from UserActivity and Lead,
   * since aggregateAnalytics runs only for yesterday.
   */
  private async augmentTodayWithRealtimeStats(
    masterId: string,
    analytics: FilledAnalyticsItem[],
  ): Promise<FilledAnalyticsItem[]> {
    if (analytics.length === 0) return analytics;

    const today = getStartOfTodayInMoldova();
    const lastItem = analytics[analytics.length - 1];
    const lastDate = new Date(lastItem.date);

    if (lastDate.getTime() !== today.getTime()) return analytics;

    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { userId: true },
    });
    const masterUserId = master?.userId ?? null;
    const viewsWhere = {
      masterId,
      action: 'view' as const,
      ...(masterUserId && {
        OR: [{ userId: null }, { userId: { not: masterUserId } }],
      }),
    };

    const todayFilter = { gte: today };

    const [viewsToday, leadsToday, reviewsAgg] = await Promise.all([
      this.prisma.userActivity.count({
        where: { ...viewsWhere, createdAt: todayFilter },
      }),
      this.prisma.lead.count({
        where: { masterId, createdAt: todayFilter },
      }),
      this.prisma.review.aggregate({
        where: {
          masterId,
          status: 'VISIBLE',
          OR: [
            { moderatedAt: todayFilter },
            { moderatedAt: null, createdAt: todayFilter },
          ],
        },
        _count: true,
        _avg: { rating: true },
      }),
    ]);

    const reviewsToday = reviewsAgg._count;
    const ratingToday = reviewsAgg._avg.rating
      ? Number(reviewsAgg._avg.rating)
      : 0;

    const result = [...analytics];
    result[result.length - 1] = {
      ...lastItem,
      viewsCount: Math.max(lastItem.viewsCount, viewsToday),
      leadsCount: Math.max(lastItem.leadsCount, leadsToday),
      reviewsCount: Math.max(lastItem.reviewsCount, reviewsToday),
      rating: ratingToday > 0 ? ratingToday : lastItem.rating,
    };
    return result;
  }

  async getAdvancedMasterAnalytics(
    masterId: string,
    days: number = 30,
  ): Promise<AdvancedAnalyticsResponse> {
    const todayStart = getStartOfTodayInMoldova();
    const startDate = new Date(
      todayStart.getTime() - days * 24 * 60 * 60 * 1000,
    );

    const basicAnalytics = await this.getMasterAnalytics(masterId, days);

    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      include: {
        category: true,
        city: true,
      },
    });

    if (!master) {
      throw new Error('Master not found');
    }

    const bookingsCount = await this.prisma.booking.count({
      where: { masterId, createdAt: { gte: startDate } },
    });

    const conversion = this.calculateConversion(basicAnalytics, bookingsCount);
    const trends = this.calculateTrends(basicAnalytics.data);
    const comparison = await this.calculateComparison(
      masterId,
      master.categoryId,
      master.cityId,
      days,
    );
    const forecast = this.calculateForecast(basicAnalytics.data);
    const peakHours = await this.getPeakHours(masterId, days);
    const heatmap = await this.getActivityHeatmap(masterId, days);
    const topSources = await this.getTopSources(masterId, days);

    return {
      ...basicAnalytics,
      bookingsCount,
      conversion,
      trends,
      comparison,
      forecast,
      peakHours,
      heatmap,
      topSources,
      insights: this.generateInsights(basicAnalytics, trends, conversion),
    };
  }

  // Вспомогательные методы для расчета аналитики мастера
  private fillMissingDates(
    analytics: MasterAnalyticsItem[],
    days: number,
  ): FilledAnalyticsItem[] {
    const result: FilledAnalyticsItem[] = [];
    const todayStart = getStartOfTodayInMoldova();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);

      const existing = analytics.find(
        (a) => toDateStringMoldova(a.date) === toDateStringMoldova(date),
      );

      result.push(
        existing ?? {
          date,
          leadsCount: 0,
          viewsCount: 0,
          reviewsCount: 0,
          rating: 0,
        },
      );
    }

    return result;
  }

  private calculateSummary(analytics: FilledAnalyticsItem[]): AnalyticsSummary {
    const totals = analytics.reduce(
      (acc, item) => ({
        totalLeads: acc.totalLeads + item.leadsCount,
        totalViews: acc.totalViews + item.viewsCount,
        totalReviews: acc.totalReviews + item.reviewsCount,
        totalRating: acc.totalRating + item.rating,
        ratedDays: acc.ratedDays + (item.rating > 0 ? 1 : 0),
      }),
      {
        totalLeads: 0,
        totalViews: 0,
        totalReviews: 0,
        totalRating: 0,
        ratedDays: 0,
      },
    );

    return {
      totalLeads: totals.totalLeads,
      totalViews: totals.totalViews,
      totalReviews: totals.totalReviews,
      avgRating:
        totals.ratedDays > 0 ? totals.totalRating / totals.ratedDays : 0,
    };
  }

  private calculateConversion(
    analytics: MasterAnalyticsResponse,
    bookingsCount: number,
  ): ConversionMetrics {
    const summary = analytics.summary;
    const viewsToLeads =
      summary.totalViews > 0
        ? (summary.totalLeads / summary.totalViews) * 100
        : 0;
    const leadsToBookings =
      summary.totalLeads > 0 ? (bookingsCount / summary.totalLeads) * 100 : 0;
    const bookingsToReviews =
      bookingsCount > 0 ? (summary.totalReviews / bookingsCount) * 100 : 0;

    return {
      viewsToLeads: Math.round(viewsToLeads * 100) / 100,
      leadsToBookings: Math.round(leadsToBookings * 100) / 100,
      bookingsToReviews: Math.round(bookingsToReviews * 100) / 100,
      avgResponseTime: 2.5,
    };
  }

  private calculateTrends(
    data: MasterAnalyticsResponse['data'],
  ): TrendAnalysis {
    if (data.length < 2) {
      return {
        leadsTrend: 'stable',
        viewsTrend: 'stable',
        leadsChangePercent: 0,
        viewsChangePercent: 0,
      };
    }

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    type DataItem = MasterAnalyticsResponse['data'][number];
    type NumericKey = keyof Pick<DataItem, 'leadsCount' | 'viewsCount'>;
    const getAvg = (arr: DataItem[], key: NumericKey): number =>
      arr.length === 0
        ? 0
        : arr.reduce((sum, d) => sum + d[key], 0) / arr.length;

    const firstAvg = {
      leads: getAvg(firstHalf, 'leadsCount'),
      views: getAvg(firstHalf, 'viewsCount'),
    };
    const secondAvg = {
      leads: getAvg(secondHalf, 'leadsCount'),
      views: getAvg(secondHalf, 'viewsCount'),
    };

    const calcChange = (oldVal: number, newVal: number) =>
      oldVal > 0 ? ((newVal - oldVal) / oldVal) * 100 : 0;

    const leadsChange = calcChange(firstAvg.leads, secondAvg.leads);
    const viewsChange = calcChange(firstAvg.views, secondAvg.views);

    return {
      leadsTrend:
        Math.abs(leadsChange) < 5 ? 'stable' : leadsChange > 0 ? 'up' : 'down',
      viewsTrend:
        Math.abs(viewsChange) < 5 ? 'stable' : viewsChange > 0 ? 'up' : 'down',
      leadsChangePercent: Math.round(leadsChange * 100) / 100,
      viewsChangePercent: Math.round(viewsChange * 100) / 100,
    };
  }

  private async calculateComparison(
    masterId: string,
    categoryId: string | null,
    cityId: string | null,
    days: number,
  ): Promise<ComparisonData> {
    const todayStart = getStartOfTodayInMoldova();
    const startDate = new Date(
      todayStart.getTime() - days * 24 * 60 * 60 * 1000,
    );

    const getAvgMetrics = async (where: Prisma.MasterWhereInput) => {
      const masters = await this.prisma.master.findMany({
        where: { ...where, id: { not: masterId } },
        include: { analytics: { where: { date: { gte: startDate } } } },
      });

      const mastersCount = masters.length;
      if (mastersCount === 0)
        return { avgLeads: 0, avgViews: 0, avgRating: 0, mastersCount: 0 };

      const totalLeads = masters.reduce(
        (sum, m) => sum + m.analytics.reduce((s, a) => s + a.leadsCount, 0),
        0,
      );
      const totalViews = masters.reduce(
        (sum, m) => sum + m.analytics.reduce((s, a) => s + a.viewsCount, 0),
        0,
      );
      const totalRating = masters.reduce(
        (sum, m) => sum + decimalToNumber(m.rating),
        0,
      );

      return {
        avgLeads: totalLeads / mastersCount,
        avgViews: totalViews / mastersCount,
        avgRating: totalRating / mastersCount,
        mastersCount,
      };
    };

    const emptyAvg = {
      avgLeads: 0,
      avgViews: 0,
      avgRating: 0,
      mastersCount: 0,
    };
    return {
      categoryAvg: categoryId ? await getAvgMetrics({ categoryId }) : emptyAvg,
      cityAvg: cityId ? await getAvgMetrics({ cityId }) : emptyAvg,
      position: {
        inCategory: categoryId
          ? await this.getMasterPosition(masterId, categoryId, 'category')
          : 0,
        inCity: cityId
          ? await this.getMasterPosition(masterId, cityId, 'city')
          : 0,
      },
    };
  }

  private async getMasterPosition(
    masterId: string,
    filterId: string,
    type: 'category' | 'city',
  ): Promise<number> {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { rating: true, leadsCount: true },
    });
    if (!master) return 0;

    const where =
      type === 'category' ? { categoryId: filterId } : { cityId: filterId };
    const betterMasters = await this.prisma.master.count({
      where: {
        ...where,
        id: { not: masterId },
        OR: [
          { rating: { gt: master.rating } },
          { rating: master.rating, leadsCount: { gt: master.leadsCount } },
        ],
      },
    });
    return betterMasters + 1;
  }

  private calculateForecast(
    data: MasterAnalyticsResponse['data'],
  ): ForecastData {
    if (data.length < 7)
      return {
        nextWeekLeads: 0,
        nextWeekViews: 0,
        confidence: 0,
      };

    const lastWeek = data.slice(-7);
    type DataItem = MasterAnalyticsResponse['data'][number];
    type NumericKey = keyof Pick<DataItem, 'leadsCount' | 'viewsCount'>;
    const getAvg = (key: NumericKey): number =>
      lastWeek.length === 0
        ? 0
        : lastWeek.reduce((sum, d) => sum + d[key], 0) / lastWeek.length;

    const avgLeads = getAvg('leadsCount');
    const avgViews = getAvg('viewsCount');

    const values = lastWeek.map((d) => d.leadsCount);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.length > 0
        ? values
            .map((v) => Math.pow(v - mean, 2))
            .reduce((sum, v) => sum + v, 0) / values.length
        : 0;
    const confidence = Math.max(0, Math.min(100, 100 - variance * 10));

    return {
      nextWeekLeads: Math.round(avgLeads * 7),
      nextWeekViews: Math.round(avgViews * 7),
      confidence: Math.round(confidence),
    };
  }

  private async getPeakHours(masterId: string, days: number) {
    const todayStart = getStartOfTodayInMoldova();
    const startDate = new Date(
      todayStart.getTime() - days * 24 * 60 * 60 * 1000,
    );

    const leads = await this.prisma.lead.findMany({
      where: { masterId, createdAt: { gte: startDate } },
      select: { createdAt: true },
    });

    const hourStats: Record<number, { leads: number; views: number }> = {};
    for (let i = 0; i < 24; i++) hourStats[i] = { leads: 0, views: 0 };

    leads.forEach((lead) => {
      const hour = getHourInMoldova(new Date(lead.createdAt));
      hourStats[hour].leads++;
    });

    return Object.entries(hourStats)
      .map(([hour, stats]) => ({
        hour: parseInt(hour),
        leadsCount: stats.leads,
        viewsCount: 0,
      }))
      .sort((a, b) => b.leadsCount - a.leadsCount)
      .slice(0, 5);
  }

  private async getTopSources(masterId: string, days: number) {
    const todayStart = getStartOfTodayInMoldova();
    const startDate = new Date(
      todayStart.getTime() - days * 24 * 60 * 60 * 1000,
    );

    const leads = await this.prisma.lead.count({
      where: { masterId, createdAt: { gte: startDate } },
    });

    return [
      { source: 'Direct', leads: Math.floor(leads * 0.6), views: 0 },
      { source: 'Search', leads: Math.floor(leads * 0.3), views: 0 },
      { source: 'Referral', leads: Math.floor(leads * 0.1), views: 0 },
    ];
  }

  private async getActivityHeatmap(masterId: string, days: number) {
    const todayStart = getStartOfTodayInMoldova();
    const startDate = new Date(
      todayStart.getTime() - days * 24 * 60 * 60 * 1000,
    );

    const leads = await this.prisma.lead.findMany({
      where: { masterId, createdAt: { gte: startDate } },
      select: { createdAt: true },
    });

    const heatmapData: Record<string, number> = {};
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        heatmapData[`${d}-${h}`] = 0;
      }
    }

    leads.forEach((lead) => {
      const date = new Date(lead.createdAt);
      const day = getDayInMoldova(date);
      const hour = getHourInMoldova(date);
      heatmapData[`${day}-${hour}`]++;
    });

    return Object.entries(heatmapData).map(([key, intensity]) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      return { dayOfWeek, hour, intensity };
    });
  }

  private generateInsights(
    analytics: MasterAnalyticsResponse,
    trends: TrendAnalysis,
    conversion: ConversionMetrics,
  ): Array<{ key: string; params?: Record<string, number | string> }> {
    const insights: Array<{
      key: string;
      params?: Record<string, number | string>;
    }> = [];

    if (trends.leadsChangePercent > 20) {
      insights.push({
        key: 'insights.leadsGrowth',
        params: { percent: Math.round(trends.leadsChangePercent * 100) / 100 },
      });
    } else if (trends.leadsChangePercent < -20) {
      insights.push({
        key: 'insights.leadsDecline',
        params: {
          percent: Math.round(Math.abs(trends.leadsChangePercent) * 100) / 100,
        },
      });
    }

    if (conversion.viewsToLeads < 2) {
      insights.push({ key: 'insights.lowConversion' });
    }

    if (conversion.leadsToBookings > 50) {
      insights.push({ key: 'insights.highConversion' });
    }

    if (
      analytics.summary.avgRating < 4.5 &&
      analytics.summary.totalReviews > 0
    ) {
      insights.push({ key: 'insights.lowRating' });
    }

    if (insights.length === 0) {
      insights.push({ key: 'insights.stable' });
    }

    return insights;
  }
}
