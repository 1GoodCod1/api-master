import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheWarmingTasksService } from './tasks/cache-warming-tasks.service';

/**
 * Оркестратор предзагрузки кеша.
 * Отвечает за: lifecycle (onModuleInit), расписание (cron), ручной вызов.
 * Делегирует выполнение задач в CacheWarmingTasksService.
 */
@Injectable()
export class CacheWarmingService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmingService.name);

  constructor(private readonly tasks: CacheWarmingTasksService) {}

  onModuleInit(): void {
    setImmediate(() => {
      this.logger.log('Starting initial cache warming...');
      void this.warmCriticalCache()
        .then(() => this.logger.log('Initial cache warming completed'))
        .catch((error) =>
          this.logger.error('Failed to warm initial cache', error),
        );
    });
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async warmCache(): Promise<void> {
    this.logger.log('Starting scheduled cache warming...');
    const startTime = Date.now();

    try {
      await this.runAllTasks();
      this.logger.log(`Cache warming completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      this.logger.error('Cache warming failed', error);
    }
  }

  async warmCacheManual(): Promise<void> {
    this.logger.log('Manual cache warming triggered');
    await this.warmCache();
  }

  private async warmCriticalCache(): Promise<void> {
    await Promise.allSettled([
      this.tasks.warmSearchFilters(),
      this.tasks.warmPopularMasters(),
      this.tasks.warmPromotions(),
      this.tasks.warmCategoriesAndCities(),
      this.tasks.warmTariffs(),
      this.tasks.warmLandingStats(),
    ]);
  }

  private async runAllTasks(): Promise<void> {
    await Promise.allSettled([
      this.tasks.warmPopularMasters(),
      this.tasks.warmNewMasters(),
      this.tasks.warmPromotions(),
      this.tasks.warmSearchFilters(),
      this.tasks.warmCategoriesAndCities(),
      this.tasks.warmTariffs(),
      this.tasks.warmTopMasters(),
      this.tasks.warmLandingStats(),
    ]);
  }
}
