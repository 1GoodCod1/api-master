import { Injectable, Logger } from '@nestjs/common';
import { NotificationStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import type { MasterWithUser } from '../types';
import { NotificationsService } from '../../../notifications/notifications/notifications.service';
import { EmailDripService } from '../../../email/email-drip.service';

/**
 * Сервис для проверки активности мастеров
 * Отслеживает неактивных мастеров и принимает меры для поддержания актуальности данных
 *
 * ФУНКЦИОНАЛЬНОСТЬ:
 * 1. Автоматическая проверка мастеров, которые не заходили более 30 дней
 * 2. Предупреждение за 5 дней до деактивации (SMS + внутреннее уведомление)
 * 3. Снижение рейтинга на 0.5 балла при деактивации
 * 4. Скрытие профиля (isOnline = false)
 * 5. Автоматическая реактивация при входе в систему
 *
 * КОНФИГУРАЦИЯ:
 * - INACTIVITY_THRESHOLD_DAYS: порог неактивности в днях (по умолчанию 30)
 * - WARNING_THRESHOLD_DAYS: когда отправлять предупреждение (по умолчанию 25)
 * - RATING_PENALTY: штраф к рейтингу (по умолчанию 0.5)
 *
 * ЗАПУСК:
 * - Автоматически каждый день в полночь (через TasksService)
 * - Использует Redis для кэширования обработанных мастеров
 */
@Injectable()
export class TasksActivityService {
  private readonly logger = new Logger(TasksActivityService.name);

  // Константы для настройки поведения (можно вынести в .env)
  private readonly INACTIVITY_THRESHOLD_DAYS = 30; // Порог неактивности в днях
  private readonly WARNING_THRESHOLD_DAYS = 25; // Предупреждение за 5 дней до деактивации
  private readonly REENGAGEMENT_THRESHOLD_DAYS = 14; // Email reengagement (до предупреждения)
  private readonly RATING_PENALTY = 0.5; // Штраф к рейтингу за неактивность

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly emailDripService: EmailDripService,
  ) {}

  /**
   * Основная задача: проверка неактивных мастеров
   * Запускается ежедневно
   */
  async checkInactiveMasters(): Promise<void> {
    this.logger.log('Starting inactive master check...');

    try {
      const inactiveThreshold = new Date();
      inactiveThreshold.setDate(
        inactiveThreshold.getDate() - this.INACTIVITY_THRESHOLD_DAYS,
      );

      const warningThreshold = new Date();
      warningThreshold.setDate(
        warningThreshold.getDate() - this.WARNING_THRESHOLD_DAYS,
      );

      const reengagementThreshold = new Date();
      reengagementThreshold.setDate(
        reengagementThreshold.getDate() - this.REENGAGEMENT_THRESHOLD_DAYS,
      );

      // Reengagement: неактивность 14–25 дней — запуск цепочки email drip
      const mastersForReengagement = await this.prisma.master.findMany({
        where: {
          lastActivityAt: {
            lt: reengagementThreshold, // inactive > 14 days
            gte: warningThreshold, // inactive < 25 days
          },
          isOnline: true,
          user: {
            isBanned: false,
          },
        },
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      });

      this.logger.log(
        `Found ${mastersForReengagement.length} masters for reengagement`,
      );

      for (const master of mastersForReengagement) {
        if (!master.user?.email) continue;
        try {
          await this.emailDripService.startChain(
            master.user.id,
            'reengagement',
          );
        } catch (err) {
          this.logger.error(
            `Reengagement failed for master ${master.id}: ${String(err)}`,
          );
        }
      }

      // Находим мастеров, которые не заходили больше месяца
      const inactiveMasters = await this.prisma.master.findMany({
        where: {
          lastActivityAt: {
            lt: inactiveThreshold,
          },
          isOnline: true, // Проверяем только тех, кто еще "активен"
          user: {
            isBanned: false, // Исключаем забаненных
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      this.logger.log(`Found ${inactiveMasters.length} inactive masters`);

      // Обрабатываем каждого неактивного мастера
      for (const master of inactiveMasters) {
        await this.deactivateInactiveMaster(master);
      }

      // Находим мастеров, которым нужно отправить предупреждение
      const mastersForWarning = await this.prisma.master.findMany({
        where: {
          lastActivityAt: {
            lt: warningThreshold,
            gte: inactiveThreshold,
          },
          isOnline: true,
          user: {
            isBanned: false,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      this.logger.log(
        `Found ${mastersForWarning.length} masters due for warning`,
      );

      // Отправляем предупреждения
      for (const master of mastersForWarning) {
        await this.sendInactivityWarning(master);
      }

      this.logger.log('Inactive master check completed');
    } catch (error) {
      this.logger.error('Inactive master check failed:', error);
      throw error;
    }
  }

  /**
   * Деактивация неактивного мастера
   */
  private async deactivateInactiveMaster(
    master: MasterWithUser,
  ): Promise<void> {
    try {
      const cacheKey = `master:inactive:${master.id}`;

      // Проверяем, не обработали ли мы уже этого мастера недавно
      const alreadyProcessed = await this.redis.get<string>(cacheKey);
      if (alreadyProcessed) {
        return;
      }

      // Снижаем рейтинг и скрываем профиль
      const newRating = Math.max(0, master.rating - this.RATING_PENALTY);

      await this.prisma.master.update({
        where: { id: master.id },
        data: {
          rating: newRating,
          isOnline: false, // Помечаем как offline
        },
      });

      // Отправляем уведомление мастеру
      await this.sendDeactivationNotification(master);

      // Сохраняем в кэш, чтобы не обрабатывать повторно (на 7 дней)
      await this.redis.set(cacheKey, '1', 60 * 60 * 24 * 7);

      this.logger.log(
        `Master ${master.id} deactivated: rating ${master.rating} -> ${newRating}`,
      );

      // Обновляем счетчики в Redis
      await this.updateRedisCounters(master.id, 'deactivated');
    } catch (error) {
      this.logger.error(`Failed to deactivate master ${master.id}:`, error);
    }
  }

  /**
   * Отправка предупреждения о скорой деактивации
   */
  private async sendInactivityWarning(master: MasterWithUser): Promise<void> {
    try {
      const cacheKey = `master:warning:${master.id}`;

      // Проверяем, не отправляли ли мы уже предупреждение
      const alreadyWarned = await this.redis.get<string>(cacheKey);
      if (alreadyWarned) {
        return;
      }

      const daysRemaining =
        this.INACTIVITY_THRESHOLD_DAYS - this.WARNING_THRESHOLD_DAYS;

      // Отправляем SMS уведомление
      await this.notifications.sendSMS(
        master.user.phone,
        `Внимание! Ваш профиль на faber.md не обновлялся ${this.WARNING_THRESHOLD_DAYS} дней. ` +
          `Через ${daysRemaining} дней ваш рейтинг будет снижен на ${this.RATING_PENALTY}, и профиль скрыт. ` +
          `Зайдите в личный кабинет для сохранения активности.`,
      );

      // Сохраняем уведомление в БД
      await this.notifications.saveNotification({
        userId: master.user.id,
        type: 'SMS',
        recipient: master.user.phone,
        status: NotificationStatus.SENT,
        title: 'Предупреждение о неактивности профиля',
        message:
          `Ваш профиль не обновлялся ${this.WARNING_THRESHOLD_DAYS} дней. ` +
          `Через ${daysRemaining} дней ваш профиль будет скрыт. Войдите в личный кабинет для сохранения активности.`,
        metadata: {
          type: 'inactivity_warning',
          thresholdDays: this.WARNING_THRESHOLD_DAYS,
          daysRemaining,
        },
      });

      // Сохраняем в кэш, чтобы не отправлять повторно (на 7 дней)
      await this.redis.set(cacheKey, '1', 60 * 60 * 24 * 7);

      this.logger.log(`Inactivity warning sent to master ${master.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send inactivity warning to master ${master.id}:`,
        error,
      );
    }
  }

  /**
   * Отправка уведомления о деактивации
   */
  private async sendDeactivationNotification(
    master: MasterWithUser,
  ): Promise<void> {
    try {
      // SMS уведомление
      await this.notifications.sendSMS(
        master.user.phone,
        `Ваш профиль на faber.md был деактивирован из-за отсутствия активности более ${this.INACTIVITY_THRESHOLD_DAYS} дней. ` +
          `Рейтинг снижен на ${this.RATING_PENALTY}. Войдите в личный кабинет для повторной активации.`,
      );

      // Сохраняем уведомление в БД
      await this.notifications.saveNotification({
        userId: master.user.id,
        type: 'SMS',
        recipient: master.user.phone,
        status: NotificationStatus.SENT,
        title: 'Ваш профиль деактивирован',
        message:
          `Ваш профиль был автоматически деактивирован из-за отсутствия активности более ${this.INACTIVITY_THRESHOLD_DAYS} дней. ` +
          `Рейтинг снижен на ${this.RATING_PENALTY}. Войдите в личный кабинет для повторной активации.`,
        metadata: {
          type: 'profile_deactivated',
          thresholdDays: this.INACTIVITY_THRESHOLD_DAYS,
          ratingPenalty: this.RATING_PENALTY,
          oldRating: master.rating,
          newRating: Math.max(0, master.rating - this.RATING_PENALTY),
        },
      });

      this.logger.log(`Deactivation notification sent to master ${master.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send deactivation notification to master ${master.id}:`,
        error,
      );
    }
  }

  /**
   * Обновление счетчиков в Redis
   */
  private async updateRedisCounters(
    masterId: string,
    action: 'deactivated',
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const counterKey = `stats:inactive:${action}:${today}`;

      await this.redis.incr(counterKey);
      await this.redis.expire(counterKey, 60 * 60 * 24 * 90); // Храним 90 дней
    } catch (error) {
      this.logger.error('Failed to update Redis counters:', error);
    }
  }

  /**
   * Реактивация мастера (опционально)
   * Примечание: Реактивация происходит автоматически в ActivityTrackerInterceptor
   * Этот метод оставлен для ручной реактивации или дополнительной логики
   */
  async reactivateMaster(masterId: string): Promise<void> {
    try {
      const master = await this.prisma.master.findUnique({
        where: { id: masterId },
        select: { isOnline: true },
      });

      // Если мастер был offline, активируем его
      if (master && !master.isOnline) {
        await this.prisma.master.update({
          where: { id: masterId },
          data: {
            isOnline: true,
          },
        });

        // Очищаем кэш предупреждений
        await this.redis.del(`master:inactive:${masterId}`);
        await this.redis.del(`master:warning:${masterId}`);

        this.logger.log(`Master ${masterId} reactivated`);
      }
    } catch (error) {
      this.logger.error(`Failed to reactivate master ${masterId}:`, error);
    }
  }

  /**
   * Получение статистики по неактивным мастерам
   */
  async getInactivityStats(): Promise<{
    totalInactive: number;
    totalDeactivated: number;
    thresholdDays: number;
    ratingPenalty: number;
  }> {
    try {
      const inactiveThreshold = new Date();
      inactiveThreshold.setDate(
        inactiveThreshold.getDate() - this.INACTIVITY_THRESHOLD_DAYS,
      );

      const [totalInactive, totalDeactivated] = await Promise.all([
        this.prisma.master.count({
          where: {
            lastActivityAt: {
              lt: inactiveThreshold,
            },
            user: {
              isBanned: false,
            },
          },
        }),
        this.prisma.master.count({
          where: {
            lastActivityAt: {
              lt: inactiveThreshold,
            },
            isOnline: false,
            user: {
              isBanned: false,
            },
          },
        }),
      ]);

      return {
        totalInactive,
        totalDeactivated,
        thresholdDays: this.INACTIVITY_THRESHOLD_DAYS,
        ratingPenalty: this.RATING_PENALTY,
      };
    } catch (error) {
      this.logger.error('Failed to get inactivity stats:', error);
      throw error;
    }
  }
}
