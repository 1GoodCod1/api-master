import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';

@Injectable()
export class LeadsAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Обновление статистики мастера и инвалидация кеша
   */
  async handlePostCreation(masterId: string) {
    // 1. Увеличиваем счетчик лидов у мастера
    await this.prisma.master.update({
      where: { id: masterId },
      data: { leadsCount: { increment: 1 } },
    });

    // 2. Инвалидируем кеш
    await this.cache.invalidate(`cache:master:${masterId}:leads:*`);
    await this.cache.del(this.cache.keys.masterStats(masterId));

    // 3. Обновляем аналитическую таблицу за сегодня
    await this.updateDailyAnalytics(masterId);
  }

  private async updateDailyAnalytics(masterId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.masterAnalytics.upsert({
      where: {
        masterId_date: {
          masterId,
          date: today,
        },
      },
      update: {
        leadsCount: { increment: 1 },
      },
      create: {
        masterId,
        date: today,
        leadsCount: 1,
      },
    });
  }
}
