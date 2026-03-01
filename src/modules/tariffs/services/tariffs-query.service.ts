import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { TariffType } from '@prisma/client';

@Injectable()
export class TariffsQueryService {
  private readonly logger = new Logger(TariffsQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Получить список всех тарифов с фильтрацией
   * @param filters Фильтры (isActive)
   */
  async findAll(filters: { isActive?: boolean } = {}) {
    const filterKey = JSON.stringify(filters);
    const cacheKey = this.cache.buildKey([
      'cache',
      'tariffs',
      'all',
      filterKey,
    ]);

    const cached = await this.cache.getOrSet(
      cacheKey,
      async () => {
        const where: Prisma.TariffWhereInput = {};
        if (filters.isActive !== undefined) {
          where.isActive = filters.isActive;
        }

        return this.prisma.tariff.findMany({
          where,
          orderBy: { sortOrder: 'asc' },
        });
      },
      this.cache.ttl.tariffs,
    );

    // Если из кэша пришёл пустой массив — проверяем БД и при наличии данных сбрасываем кэш
    if (Array.isArray(cached) && cached.length === 0) {
      const where: Prisma.TariffWhereInput = {};
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      const count = await this.prisma.tariff.count({ where });
      if (count > 0) {
        this.logger.warn(
          `Tariffs cache was stale (empty). DB has ${count} tariffs. Invalidating cache.`,
        );
        await this.cache.del(cacheKey);
        await this.cache.invalidate('cache:tariffs:all:*');
        return this.prisma.tariff.findMany({
          where,
          orderBy: { sortOrder: 'asc' },
        });
      }
    }

    return cached;
  }

  /**
   * Получить тариф по ID
   * @param id ID тарифа
   */
  async findOne(id: string) {
    const cacheKey = this.cache.keys.tariffById(id);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const tariff = await this.prisma.tariff.findUnique({ where: { id } });
        if (!tariff) throw new NotFoundException('Тариф не найден');
        return tariff;
      },
      this.cache.ttl.tariffs,
    );
  }

  /**
   * Найти тариф по его типу (BASIC, VIP, PREMIUM)
   * @param type Тип тарифа
   */
  async findByType(type: TariffType) {
    const cacheKey = this.cache.keys.tariffByType(type);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const tariff = await this.prisma.tariff.findUnique({ where: { type } });
        if (!tariff)
          throw new NotFoundException(`Тариф с типом ${type} не найден`);
        return tariff;
      },
      this.cache.ttl.tariffs,
    );
  }

  /**
   * Получить только активные тарифы
   */
  async getActiveTariffs() {
    return this.findAll({ isActive: true });
  }
}
