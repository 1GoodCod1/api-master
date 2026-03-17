import { Injectable, Logger } from '@nestjs/common';
import { ReviewStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { getStartOfTodayInMoldova } from '../../shared/utils/timezone.util';

@Injectable()
export class TasksAnalyticsService {
  private readonly logger = new Logger(TasksAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Агрегация аналитики за прошедшие сутки (для мастеров и системы).
   * Использует timezone Moldova (Europe/Chisinau) для корректных границ "вчера".
   */
  async aggregateAnalytics() {
    const todayStart = getStartOfTodayInMoldova();
    const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const dayEnd = new Date(yesterday.getTime() + 24 * 60 * 60 * 1000);

    // Получаем всех мастеров
    const masters = await this.prisma.master.findMany({
      select: { id: true, userId: true },
    });

    for (const master of masters) {
      const dateRange = { gte: yesterday, lt: dayEnd };

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
          masterId_date: { masterId: master.id, date: yesterday },
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
          date: yesterday,
          leadsCount: leads,
          viewsCount: views,
          reviewsCount,
          rating: avgRating,
          revenue: 0,
        },
      });
    }

    // Системная аналитика
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
            lt: dayEnd,
          },
        },
      }),
      this.prisma.review.count({
        where: {
          createdAt: {
            gte: yesterday,
            lt: dayEnd,
          },
        },
      }),
      this.prisma.user.count({
        where: {
          lastLoginAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
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

    this.logger.log('Analytics aggregated for yesterday');
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
      orderBy: { date: 'desc' },
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
