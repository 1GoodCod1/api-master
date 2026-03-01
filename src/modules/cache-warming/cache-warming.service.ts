import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from '../shared/cache/cache.service';
import { MastersService } from '../masters/masters.service';
import { CategoriesService } from '../categories/categories.service';
import { CitiesService } from '../cities/cities.service';
import { TariffsService } from '../tariffs/tariffs.service';
import { SearchMastersDto } from '../masters/dto/search-masters.dto';

@Injectable()
export class CacheWarmingService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmingService.name);

  constructor(
    private readonly cache: CacheService,
    private readonly mastersService: MastersService,
    private readonly categoriesService: CategoriesService,
    private readonly citiesService: CitiesService,
    private readonly tariffsService: TariffsService,
  ) {}

  /**
   * Выполняется при старте приложения
   * Предзагружает критичные данные в кеш (неблокирующий режим)
   */
  onModuleInit() {
    setImmediate(() => {
      this.logger.log('Starting initial cache warming...');
      void this.warmCriticalCache()
        .then(() => this.logger.log('Initial cache warming completed'))
        .catch((error) =>
          this.logger.error('Failed to warm initial cache', error),
        );
    });
  }

  /**
   * Предзагрузка критичных данных при старте
   */
  private async warmCriticalCache() {
    await Promise.allSettled([
      // Фильтры поиска - критично для главной страницы
      this.warmSearchFilters(),
      // Популярные мастера - главная страница
      this.warmPopularMasters(),
      // Категории и города - используются везде
      this.warmCategoriesAndCities(),
      // Тарифы - страница планов
      this.warmTariffs(),
      // Landing stats - hero section
      this.warmLandingStats(),
    ]);
  }

  /**
   * Полная предзагрузка кеша
   * Вызывается по расписанию
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async warmCache() {
    this.logger.log('Starting scheduled cache warming...');

    const startTime = Date.now();

    try {
      await Promise.allSettled([
        // Основные данные
        this.warmPopularMasters(),
        this.warmNewMasters(),
        this.warmSearchFilters(),
        this.warmCategoriesAndCities(),
        this.warmTariffs(),
        this.warmTopMasters(),
        this.warmLandingStats(),
      ]);

      const duration = Date.now() - startTime;
      this.logger.log(`Cache warming completed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Cache warming failed', error);
    }
  }

  /**
   * Предзагрузка популярных мастеров
   */
  private async warmPopularMasters() {
    try {
      // Предзагружаем разные лимиты для разных страниц
      await Promise.all([
        this.mastersService.getPopularMasters(10), // Главная страница
        this.mastersService.getPopularMasters(20), // Страница мастеров
        this.mastersService.getPopularMasters(50), // Для пагинации
      ]);

      this.logger.debug('Popular masters cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm popular masters cache', error);
    }
  }

  /**
   * Предзагрузка новых мастеров
   */
  private async warmNewMasters() {
    try {
      await Promise.all([
        this.mastersService.getNewMasters(10), // Главная страница
        this.mastersService.getNewMasters(20), // Страница мастеров
      ]);

      this.logger.debug('New masters cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm new masters cache', error);
    }
  }

  /**
   * Предзагрузка фильтров поиска
   */
  private async warmSearchFilters() {
    try {
      await this.mastersService.getSearchFilters();
      this.logger.debug('Search filters cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm search filters cache', error);
    }
  }

  /**
   * Предзагрузка категорий и городов
   */
  private async warmCategoriesAndCities() {
    try {
      await Promise.all([
        // Категории - активные
        this.categoriesService.findAll({ isActive: true }),
        // Категории - все
        this.categoriesService.findAll(),
        // Города - активные
        this.citiesService.findAll({ isActive: true }),
        // Города - все
        this.citiesService.findAll(),
      ]);

      this.logger.debug('Categories and cities cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm categories and cities cache', error);
    }
  }

  /**
   * Предзагрузка тарифов
   */
  private async warmTariffs() {
    try {
      await Promise.all([
        this.tariffsService.findAll({ isActive: true }),
        this.tariffsService.findAll(),
        this.tariffsService.getActiveTariffs().catch(() => null),
        this.tariffsService.findByType('BASIC').catch(() => null),
        this.tariffsService.findByType('VIP').catch(() => null),
        this.tariffsService.findByType('PREMIUM').catch(() => null),
      ]);

      this.logger.debug('Tariffs cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm tariffs cache', error);
    }
  }

  /**
   * Предзагрузка топ мастеров по категориям и городам
   */
  private async warmTopMasters() {
    try {
      const [categories, cities] = await Promise.all([
        this.categoriesService.findAll({ isActive: true }),
        this.citiesService.findAll({ isActive: true }),
      ]);

      // Предзагружаем топ мастеров для популярных комбинаций
      const topMastersPromises: Promise<unknown>[] = [];

      // Топ по категориям (без города)
      for (const category of categories.slice(0, 5)) {
        const dto: SearchMastersDto = {
          categoryId: category.id,
          limit: 10,
          page: 1,
          sortBy: 'rating',
          sortOrder: 'desc',
        };
        topMastersPromises.push(
          this.mastersService.findAll(dto).catch((err) => {
            this.logger.warn(
              `Failed to warm top masters for category ${category.id}`,
              err,
            );
          }),
        );
      }

      // Топ по городам (без категории)
      for (const city of cities.slice(0, 5)) {
        const dto: SearchMastersDto = {
          cityId: city.id,
          limit: 10,
          page: 1,
          sortBy: 'rating',
          sortOrder: 'desc',
        };
        topMastersPromises.push(
          this.mastersService.findAll(dto).catch((err) => {
            this.logger.warn(
              `Failed to warm top masters for city ${city.id}`,
              err,
            );
          }),
        );
      }

      // Популярные комбинации категория + город
      for (const category of categories.slice(0, 3)) {
        for (const city of cities.slice(0, 3)) {
          const dto: SearchMastersDto = {
            categoryId: category.id,
            cityId: city.id,
            limit: 10,
            page: 1,
            sortBy: 'rating',
            sortOrder: 'desc',
          };
          topMastersPromises.push(
            this.mastersService.findAll(dto).catch((err) => {
              this.logger.warn(
                `Failed to warm top masters for category ${category.id} + city ${city.id}`,
                err,
              );
            }),
          );
        }
      }

      await Promise.allSettled(topMastersPromises);
      this.logger.debug('Top masters cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm top masters cache', error);
    }
  }

  /**
   * Ручной вызов cache warming (для админки или API)
   */
  async warmCacheManual() {
    this.logger.log('Manual cache warming triggered');
    await this.warmCache();
  }

  /**
   * Предзагрузка статистики лендинга
   */
  private async warmLandingStats() {
    try {
      await this.mastersService.getLandingStats();
      this.logger.debug('Landing stats cache warmed');
    } catch (error) {
      this.logger.error('Failed to warm landing stats cache', error);
    }
  }
}
