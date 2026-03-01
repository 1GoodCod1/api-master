import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksTariffService } from './services/tasks-tariff.service';
import { TasksAnalyticsService } from './services/tasks-analytics.service';
import { TasksMaintenanceService } from './services/tasks-maintenance.service';
import { TasksActivityService } from './services/tasks-activity.service';
import { TasksBookingReminderService } from './services/tasks-booking-reminder.service';

/**
 * TasksService — координатор фоновых задач системы.
 * Использует специализированные сервисы для выполнения регламентных работ.
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly tariffTasks: TasksTariffService,
    private readonly analyticsTasks: TasksAnalyticsService,
    private readonly maintenanceTasks: TasksMaintenanceService,
    private readonly activityTasks: TasksActivityService,
    private readonly bookingReminderTasks: TasksBookingReminderService,
  ) {}

  /**
   * Ежедневные задачи (в полночь)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyTasks() {
    this.logger.log('Запуск ежедневных задач...');

    await Promise.all([
      this.maintenanceTasks.cleanOldLeads(),
      this.tariffTasks.checkExpiredTariffs(),
      this.analyticsTasks.aggregateAnalytics(),
      this.analyticsTasks.sendDailyReports(),
      this.maintenanceTasks.cleanupExpiredTokens(),
      this.activityTasks.checkInactiveMasters(),
    ]);

    this.logger.log('Ежедневные задачи завершены');
  }

  /**
   * Ежечасные задачи
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyTasks() {
    this.logger.log('Запуск ежечасных задач...');

    await Promise.all([
      this.maintenanceTasks.syncRedisCounters(),
      this.maintenanceTasks.checkSystemHealth(),
      this.tariffTasks.checkPendingUpgradeTimeouts(),
      this.tariffTasks.sendTariffExpirationReminders(),
      this.bookingReminderTasks.sendBookingReminders(),
    ]);
  }

  /**
   * Задачи каждые 30 минут
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleHalfHourTasks() {
    await Promise.all([
      this.maintenanceTasks.updateMasterRatings(),
      this.tariffTasks.autoBoostMasters(),
    ]);
  }
}
