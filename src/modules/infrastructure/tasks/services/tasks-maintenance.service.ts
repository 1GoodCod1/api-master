import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadStatus, ReviewStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import type Redis from 'ioredis';
import { RedisService } from '../../../shared/redis/redis.service';
import { NotificationsService } from '../../../notifications/notifications/notifications.service';
import { VerificationDocumentsPurgeService } from '../../../verification/services/verification-documents-purge.service';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

@Injectable()
export class TasksMaintenanceService {
  private readonly logger = new Logger(TasksMaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly configService: ConfigService,
    private readonly verificationDocumentsPurge: VerificationDocumentsPurgeService,
  ) {}

  /**
   * Очистка старых лидов (старше 30 дней со статусом CLOSED)
   */
  async cleanOldLeads() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.lead.deleteMany({
      where: {
        status: LeadStatus.CLOSED,
        updatedAt: { lt: thirtyDaysAgo },
      },
    });

    this.logger.log(`Cleaned ${result.count} old leads`);
  }

  /**
   * Синхронизация счетчиков просмотров из Redis в базу данных
   */
  async syncRedisCounters() {
    const redis = this.redis.getClient();
    const keys = await redis.keys('master:*:views');

    for (const key of keys) {
      const viewsStr = await redis.get(key);
      const views = viewsStr ? parseInt(viewsStr, 10) : 0;
      const masterId = key.split(':')[1];

      if (views > 0 && masterId) {
        await this.prisma.master.update({
          where: { id: masterId },
          data: { views: { increment: views } },
        });
        await redis.set(key, '0');
      }
    }

    this.logger.log(`Synced ${keys.length} view counters`);
  }

  /**
   * Проверка здоровья системы (Redis, очереди)
   */
  async checkSystemHealth() {
    const redis = this.redis.getClient();
    const [redisPing, queueStats] = await Promise.all([
      redis.ping(),
      this.getQueueStats(redis),
    ]);

    if (redisPing !== 'PONG') {
      this.logger.error('Redis health check failed');
      await this.notifications.sendTelegram('🚨 Redis health check failed!');
    }

    for (const [queue, stats] of Object.entries(queueStats)) {
      if (stats.waiting > 100) {
        this.logger.warn(`Queue ${queue} has backlog: ${stats.waiting} jobs`);
      }
    }
  }

  /**
   * Массовое обновление рейтингов мастеров на основе отзывов
   */
  async updateMasterRatings() {
    const masters = await this.prisma.master.findMany({ select: { id: true } });

    for (const master of masters) {
      const reviews = await this.prisma.review.aggregate({
        where: { masterId: master.id, status: ReviewStatus.VISIBLE },
        _avg: { rating: true },
        _count: true,
      });

      if (reviews._avg.rating !== null) {
        await this.prisma.master.update({
          where: { id: master.id },
          data: {
            rating: reviews._avg.rating,
            totalReviews: reviews._count,
          },
        });
      }
    }

    this.logger.log(`Updated ratings for ${masters.length} masters`);
  }

  /**
   * Очистка истекших токенов авторизации
   */
  async cleanupExpiredTokens() {
    const now = new Date();

    const deletedRefreshTokens = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    const deletedPasswordResetTokens =
      await this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: now } }, { used: true }],
          createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const deletedActivities = await this.prisma.userActivity.deleteMany({
      where: {
        createdAt: { lt: sixtyDaysAgo },
      },
    });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const deletedLoginHistory = await this.prisma.loginHistory.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
      },
    });

    const deletedPhoneVerifications =
      await this.prisma.phoneVerification.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { verified: true, createdAt: { lt: sixtyDaysAgo } },
          ],
        },
      });

    const totalCleaned =
      deletedRefreshTokens.count +
      deletedPasswordResetTokens.count +
      deletedActivities.count +
      deletedLoginHistory.count +
      deletedPhoneVerifications.count;

    if (totalCleaned > 0) {
      this.logger.log(
        `Data retention cleanup: ${deletedRefreshTokens.count} refresh tokens, ` +
          `${deletedPasswordResetTokens.count} password reset tokens, ` +
          `${deletedActivities.count} user activities (>60d), ` +
          `${deletedLoginHistory.count} login history (>90d), ` +
          `${deletedPhoneVerifications.count} phone verifications`,
      );
    }
  }

  /**
   * GDPR: повторная очистка файлов верификации (основное удаление — сразу после approve).
   */
  async cleanupVerificationDocuments() {
    await this.verificationDocumentsPurge.purgeRemainingApprovedVerificationFiles();
  }

  private async getQueueStats(
    redis: Redis,
  ): Promise<Record<string, QueueStats>> {
    const queues = ['sms', 'telegram'];
    const stats: Record<string, QueueStats> = {};

    for (const queue of queues) {
      const [waiting, active, completed, failed] = await Promise.all([
        redis.llen(`bull:${queue}:wait`),
        redis.llen(`bull:${queue}:active`),
        redis.zcard(`bull:${queue}:completed`),
        redis.zcard(`bull:${queue}:failed`),
      ]);

      stats[queue] = {
        waiting: Number(waiting) || 0,
        active: Number(active) || 0,
        completed: Number(completed) || 0,
        failed: Number(failed) || 0,
      };
    }

    return stats;
  }
}
