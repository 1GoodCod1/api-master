import { Injectable } from '@nestjs/common';
import {
  VIEWS_HISTORY_PERIOD,
  type ViewsHistoryPeriod,
} from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';

function getStartOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getStartOfISOWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const daysToMonday = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - daysToMonday);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getStartOfMonth(d: Date): Date {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

@Injectable()
export class MastersStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getStats(masterId: string) {
    const cacheKey = this.cache.keys.masterStats(masterId);
    const now = new Date();

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const todayStart = getStartOfDay(now);
        const weekStart = getStartOfISOWeek(now);
        const monthStart = getStartOfMonth(now);
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

        const [
          today,
          weekAgo,
          monthAgo,
          viewsToday,
          viewsThisWeek,
          viewsThisMonth,
        ] = await Promise.all([
          this.prisma.lead.count({
            where: { masterId, createdAt: { gte: todayStart } },
          }),
          this.prisma.lead.count({
            where: { masterId, createdAt: { gte: weekStart } },
          }),
          this.prisma.lead.count({
            where: { masterId, createdAt: { gte: monthStart } },
          }),
          this.prisma.userActivity.count({
            where: { ...viewsWhere, createdAt: { gte: todayStart } },
          }),
          this.prisma.userActivity.count({
            where: { ...viewsWhere, createdAt: { gte: weekStart } },
          }),
          this.prisma.userActivity.count({
            where: { ...viewsWhere, createdAt: { gte: monthStart } },
          }),
        ]);

        return {
          leadsToday: today,
          leadsThisWeek: weekAgo,
          leadsThisMonth: monthAgo,
          viewsToday,
          viewsThisWeek,
          viewsThisMonth,
        };
      },
      this.cache.ttl.masterStats, // 5 minutes
    );
  }

  async getViewsHistory(
    masterId: string,
    period: ViewsHistoryPeriod,
    limit = 12,
  ): Promise<
    { periodStart: string; periodEnd: string; views: number; label: string }[]
  > {
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

    if (period === VIEWS_HISTORY_PERIOD.WEEK) {
      const weeks: { start: Date; end: Date }[] = [];
      let cursor = getStartOfISOWeek(new Date());
      for (let i = 0; i < limit; i++) {
        const weekEnd = new Date(
          cursor.getTime() + 7 * 24 * 60 * 60 * 1000 - 1,
        );
        weeks.push({ start: new Date(cursor), end: weekEnd });
        cursor = new Date(cursor.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      const results = await Promise.all(
        weeks.map(async (w) => {
          const count = await this.prisma.userActivity.count({
            where: {
              ...viewsWhere,
              createdAt: { gte: w.start, lte: w.end },
            },
          });
          const label = `${w.start.getDate()}.${w.start.getMonth() + 1} - ${w.end.getDate()}.${w.end.getMonth() + 1}.${w.end.getFullYear()}`;
          return {
            periodStart: w.start.toISOString(),
            periodEnd: w.end.toISOString(),
            views: count,
            label,
          };
        }),
      );
      return results;
    }

    const months: { start: Date; end: Date }[] = [];
    let monthCursor = getStartOfMonth(new Date());
    for (let i = 0; i < limit; i++) {
      const start = new Date(monthCursor);
      const end = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      months.push({ start, end });
      monthCursor = new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth() - 1,
        1,
      );
    }
    const results = await Promise.all(
      months.map(async (m) => {
        const count = await this.prisma.userActivity.count({
          where: {
            ...viewsWhere,
            createdAt: { gte: m.start, lte: m.end },
          },
        });
        const label = `${m.start.getMonth() + 1}/${m.start.getFullYear()}`;
        return {
          periodStart: m.start.toISOString(),
          periodEnd: m.end.toISOString(),
          views: count,
          label,
        };
      }),
    );
    return results;
  }
}
