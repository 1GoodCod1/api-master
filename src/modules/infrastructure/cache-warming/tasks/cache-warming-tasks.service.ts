import { Injectable, Logger } from '@nestjs/common';
import { MastersCacheWarmingFacade } from '../../../marketplace/masters/facades/masters-cache-warming.facade';
import { CategoriesService } from '../../../marketplace/categories/categories.service';
import { CitiesService } from '../../../marketplace/cities/cities.service';
import { TariffsService } from '../../../marketplace/tariffs/tariffs.service';
import { PromotionsService } from '../../../marketplace/promotions/promotions.service';
import { SearchMastersDto } from '../../../marketplace/masters/dto/search-masters.dto';
import {
  CACHE_WARMING_LIMITS,
  CACHE_WARMING_TOP_MASTERS_SORT,
} from '../config/cache-warming.config';

/**
 * Сервис задач предзагрузки кеша.
 * Каждый метод отвечает за один домен. Ошибки логируются, не прерывают общий процесс.
 */
@Injectable()
export class CacheWarmingTasksService {
  private readonly logger = new Logger(CacheWarmingTasksService.name);

  constructor(
    private readonly mastersCacheWarming: MastersCacheWarmingFacade,
    private readonly categoriesService: CategoriesService,
    private readonly citiesService: CitiesService,
    private readonly tariffsService: TariffsService,
    private readonly promotionsService: PromotionsService,
  ) {}

  async warmPopularMasters(): Promise<void> {
    await this.runTask('Popular masters', () =>
      Promise.all(
        CACHE_WARMING_LIMITS.popularMasters.map((limit) =>
          this.mastersCacheWarming.getPopularMasters(limit),
        ),
      ),
    );
  }

  async warmNewMasters(): Promise<void> {
    await this.runTask('New masters', () =>
      Promise.all(
        CACHE_WARMING_LIMITS.newMasters.map((limit) =>
          this.mastersCacheWarming.getNewMasters(limit),
        ),
      ),
    );
  }

  async warmPromotions(): Promise<void> {
    await this.runTask('Promotions', () =>
      Promise.all(
        CACHE_WARMING_LIMITS.promotions.map((limit) =>
          this.promotionsService.findActivePromotions(limit),
        ),
      ),
    );
  }

  async warmSearchFilters(): Promise<void> {
    await this.runTask('Search filters', () =>
      this.mastersCacheWarming.getSearchFilters(),
    );
  }

  async warmCategoriesAndCities(): Promise<void> {
    await this.runTask('Categories and cities', () =>
      Promise.all([
        this.categoriesService.findAll({ isActive: true }),
        this.categoriesService.findAll(),
        this.citiesService.findAll({ isActive: true }),
        this.citiesService.findAll(),
      ]),
    );
  }

  async warmTariffs(): Promise<void> {
    await this.runTask('Tariffs', () =>
      Promise.all([
        this.tariffsService.findAll({ isActive: true }),
        this.tariffsService.findAll(),
      ]),
    );
  }

  async warmTopMasters(): Promise<void> {
    await this.runTask('Top masters', async () => {
      const [categories, cities] = await Promise.all([
        this.categoriesService.findAll({ isActive: true }),
        this.citiesService.findAll({ isActive: true }),
      ]);

      const promises = [
        ...this.buildTopMastersByCategory(categories),
        ...this.buildTopMastersByCity(cities),
        ...this.buildTopMastersByCategoryAndCity(categories, cities),
      ];

      await Promise.allSettled(promises);
    });
  }

  async warmLandingStats(): Promise<void> {
    await this.runTask('Landing stats', () =>
      this.mastersCacheWarming.getLandingStats(),
    );
  }

  private buildTopMastersByCategory(
    categories: Array<{ id: string }>,
  ): Promise<unknown>[] {
    return categories
      .slice(0, CACHE_WARMING_LIMITS.topMastersPerCategory)
      .map((category) =>
        this.mastersCacheWarming
          .findAllForSearch(this.createSearchDto({ categoryId: category.id }))
          .catch((err) =>
            this.logger.warn(
              `Failed to warm top masters for category ${category.id}`,
              err,
            ),
          ),
      );
  }

  private buildTopMastersByCity(
    cities: Array<{ id: string }>,
  ): Promise<unknown>[] {
    return cities
      .slice(0, CACHE_WARMING_LIMITS.topMastersPerCity)
      .map((city) =>
        this.mastersCacheWarming
          .findAllForSearch(this.createSearchDto({ cityId: city.id }))
          .catch((err) =>
            this.logger.warn(
              `Failed to warm top masters for city ${city.id}`,
              err,
            ),
          ),
      );
  }

  private buildTopMastersByCategoryAndCity(
    categories: Array<{ id: string }>,
    cities: Array<{ id: string }>,
  ): Promise<unknown>[] {
    const promises: Promise<unknown>[] = [];
    const catLimit = CACHE_WARMING_LIMITS.topMastersCategoryCityCombinations;
    const cityLimit = CACHE_WARMING_LIMITS.topMastersCategoryCityCombinations;

    for (const category of categories.slice(0, catLimit)) {
      for (const city of cities.slice(0, cityLimit)) {
        promises.push(
          this.mastersCacheWarming
            .findAllForSearch(
              this.createSearchDto({
                categoryId: category.id,
                cityId: city.id,
              }),
            )
            .catch((err) =>
              this.logger.warn(
                `Failed to warm top masters for category ${category.id} + city ${city.id}`,
                err,
              ),
            ),
        );
      }
    }
    return promises;
  }

  private createSearchDto(overrides: {
    categoryId?: string;
    cityId?: string;
  }): SearchMastersDto {
    return {
      ...overrides,
      limit: CACHE_WARMING_LIMITS.topMastersLimit,
      page: 1,
      ...CACHE_WARMING_TOP_MASTERS_SORT,
    };
  }

  private async runTask(
    name: string,
    fn: () => Promise<unknown>,
  ): Promise<void> {
    try {
      await fn();
      this.logger.debug(`${name} cache warmed`);
    } catch (error) {
      this.logger.error(`Failed to warm ${name} cache`, error);
    }
  }
}
