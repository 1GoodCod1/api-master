import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus, ReviewStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class TasksAnalyticsService {
  private readonly logger = new Logger(TasksAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Агрегация аналитики за прошедшие сутки (для мастеров и системы)
   */
  async aggregateAnalytics() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Получаем всех мастеров
    const masters = await this.prisma.master.findMany({
      select: { id: true, userId: true },
    });

    for (const master of masters) {
      const [leads, reviews, payments, views] = await Promise.all([
        this.prisma.lead.count({
          where: {
            masterId: master.id,
            createdAt: {
              gte: yesterday,
              lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        }),
        this.prisma.review.count({
          where: {
            masterId: master.id,
            createdAt: {
              gte: yesterday,
              lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
            },
            status: ReviewStatus.VISIBLE,
          },
        }),
        this.prisma.payment.aggregate({
          where: {
            masterId: master.id,
            createdAt: {
              gte: yesterday,
              lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
            },
            status: PaymentStatus.SUCCESS,
          },
          _sum: { amount: true },
        }),
        this.prisma.userActivity.count({
          where: {
            masterId: master.id,
            action: 'view',
            createdAt: {
              gte: yesterday,
              lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
            },
            ...(master.userId && {
              OR: [{ userId: null }, { userId: { not: master.userId } }],
            }),
          },
        }),
      ]);

      await this.prisma.masterAnalytics.upsert({
        where: {
          masterId_date: { masterId: master.id, date: yesterday },
        },
        update: {
          leadsCount: leads,
          viewsCount: views,
          reviewsCount: reviews,
          revenue: payments._sum.amount || 0,
        },
        create: {
          masterId: master.id,
          date: yesterday,
          leadsCount: leads,
          viewsCount: views,
          reviewsCount: reviews,
          revenue: payments._sum.amount || 0,
        },
      });
    }

    // Системная аналитика
    const [
      totalUsers,
      totalMasters,
      totalLeads,
      totalReviews,
      totalRevenue,
      activeUsers,
      redisKeys,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.master.count(),
      this.prisma.lead.count({
        where: {
          createdAt: {
            gte: yesterday,
            lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.review.count({
        where: {
          createdAt: {
            gte: yesterday,
            lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          createdAt: {
            gte: yesterday,
            lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
          },
          status: PaymentStatus.SUCCESS,
        },
        _sum: { amount: true },
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
        totalRevenue: totalRevenue._sum.amount || 0,
        activeUsers,
        redisKeys,
      },
    });

    this.logger.log('Analytics aggregated for yesterday');
  }

  /**
   * Отправка ежедневного отчета администраторам (в Telegram)
   */
  async sendDailyReports() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

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
