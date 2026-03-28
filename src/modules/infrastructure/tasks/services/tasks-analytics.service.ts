import { Injectable, Logger } from '@nestjs/common';
import { ReviewStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_DESC } from '../../../shared/constants/sort-order.constants';
import { RedisService } from '../../../shared/redis/redis.service';
import { NotificationsService } from '../../../notifications/notifications/notifications.service';
import { getStartOfTodayInMoldova } from '../../../shared/utils/timezone.util';

@Injectable()
export class TasksAnalyticsService {
  private readonly logger = new Logger(TasksAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Агрегация аналитики за последние 3 дня (для мастеров и системы).
   * Backfill за 3 дня гарантирует, что пропущенные дни (из-за рестарта, ошибок)
   * будут пересчитаны корректно.
   * Использует timezone Moldova (Europe/Chisinau) для корректных границ дней.
   */
  async aggregateAnalytics() {
    const todayStart = getStartOfTodayInMoldova();
    const BACKFILL_DAYS = 14;

    const masters = await this.prisma.master.findMany({
      select: { id: true, userId: true },
    });

    for (let dayOffset = 1; dayOffset <= BACKFILL_DAYS; dayOffset++) {
      const dayStart = new Date(
        todayStart.getTime() - dayOffset * 24 * 60 * 60 * 1000,
      );
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dateRange = { gte: dayStart, lt: dayEnd };

      for (const master of masters) {
        const [leads, reviewsAgg, views] = await Promise.all([
          this.prisma.lead.count({
            where: { masterId: master.id, createdAt: dateRange },
          }),
          this.prisma.review.aggregate({
            where: {
              masterId: master.id,
              status: ReviewStatus.VISIBLE,
              OR: [
                { moderatedAt: dateRange },
                { moderatedAt: null, createdAt: dateRange },
              ],
            },
            _count: true,
            _avg: { rating: true },
          }),
          this.prisma.userActivity.count({
            where: {
              masterId: master.id,
              action: 'view',
              createdAt: dateRange,
              ...(master.userId && {
                OR: [{ userId: null }, { userId: { not: master.userId } }],
              }),
            },
          }),
        ]);

        const reviewsCount = reviewsAgg._count;
        const avgRating = reviewsAgg._avg.rating ?? 0;

        await this.prisma.masterAnalytics.upsert({
          where: {
            masterId_date: { masterId: master.id, date: dayStart },
          },
          update: {
            leadsCount: leads,
            viewsCount: views,
            reviewsCount,
            rating: avgRating,
            revenue: 0,
          },
          create: {
            masterId: master.id,
            date: dayStart,
            leadsCount: leads,
            viewsCount: views,
            reviewsCount,
            rating: avgRating,
            revenue: 0,
          },
        });
      }
    }

    // Системная аналитика (только за вчера, чтобы не дублировать)
    const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(yesterday.getTime() + 24 * 60 * 60 * 1000);

    const existingSystemAnalytics = await this.prisma.systemAnalytics.findFirst(
      {
        where: { date: yesterday },
      },
    );

    if (!existingSystemAnalytics) {
      const [
        totalUsers,
        totalMasters,
        totalLeads,
        totalReviews,
        activeUsers,
        redisKeys,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.master.count(),
        this.prisma.lead.count({
          where: {
            createdAt: {
              gte: yesterday,
              lt: yesterdayEnd,
            },
          },
        }),
        this.prisma.review.count({
          where: {
            createdAt: {
              gte: yesterday,
              lt: yesterdayEnd,
            },
          },
        }),
        this.prisma.user.count({
          where: {
            lastLoginAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        this.redis.getClient().dbsize(),
      ]);

      await this.prisma.systemAnalytics.create({
        data: {
          date: yesterday,
          totalUsers,
          totalMasters,
          totalLeads,
          totalReviews,
          totalRevenue: 0,
          activeUsers,
          redisKeys,
        },
      });
    }

    this.logger.log(`Аналитика агрегирована за последние ${BACKFILL_DAYS} дня`);
  }

  /**
   * Отправка ежедневного отчета администраторам (в Telegram).
   * Ищет запись за вчера (Moldova timezone).
   */
  async sendDailyReports() {
    const todayStart = getStartOfTodayInMoldova();
    const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const stats = await this.prisma.systemAnalytics.findFirst({
      where: { date: { gte: yesterday } },
      orderBy: { date: SORT_DESC },
    });

    if (stats) {
      const message =
        `📊 Ежедневный отчет:\n` +
        `Пользователи: +${stats.totalUsers}\n` +
        `Мастера: +${stats.totalMasters}\n` +
        `Заявки: ${stats.totalLeads}\n` +
        `Отзывы: ${stats.totalReviews}\n`;

      await this.notifications.sendTelegram(message);
    }
  }
}
