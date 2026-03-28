import { Injectable, Logger } from '@nestjs/common';
import { AppErrors, AppErrorTemplates } from '../../../common/errors';
import { CacheService } from '../cache/cache.service';
import type { CrudCacheableEntityConfig } from '../types/crud-cacheable.types';

export type { CrudCacheableEntityConfig };

/**
 * Базовый CRUD для сущностей с кешем (города, категории).
 * Убирает дублирование между CitiesActionService и CategoriesActionService.
 */
@Injectable()
export abstract class CrudCacheableEntityActionService<
  TEntity extends { id: string; isActive?: boolean },
  TCreateDto,
  TUpdateDto extends { isActive?: boolean },
> {
  protected readonly logger: Logger;
  protected readonly cache: CacheService;
  protected readonly config: CrudCacheableEntityConfig<
    TEntity,
    TCreateDto,
    TUpdateDto
  >;

  constructor(
    cache: CacheService,
    config: CrudCacheableEntityConfig<TEntity, TCreateDto, TUpdateDto>,
  ) {
    this.cache = cache;
    this.config = config;
    this.logger = new Logger(config.entityName);
  }

  async create(dto: TCreateDto): Promise<TEntity> {
    try {
      const entity = await this.config.createEntity(dto);
      await this.config.invalidateGlobalCaches();
      return entity;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create ${this.config.entityNameAccusative}: ${message}`,
      );
      throw error;
    }
  }

  async update(id: string, dto: TUpdateDto): Promise<TEntity> {
    await this.config.ensureExists(id);
    const updated = await this.config.updateEntity(id, dto);
    await this.invalidateEntityCache(id);
    await this.config.invalidateGlobalCaches();
    return updated;
  }

  async remove(id: string): Promise<TEntity> {
    const entity = await this.config.findWithMastersCount(id);

    if (!entity) {
      const name =
        this.config.entityNameSingular.charAt(0).toUpperCase() +
        this.config.entityNameSingular.slice(1);
      throw AppErrors.notFound(
        AppErrorTemplates.entityWithIdNotFound(name, id),
      );
    }

    if (entity._count.masters > 0) {
      throw AppErrors.badRequest(
        AppErrorTemplates.entityDeleteBlocked(this.config.entityNameSingular),
      );
    }

    const deleted = await this.config.deleteEntity(id);
    await this.invalidateEntityCache(id);
    await this.config.invalidateGlobalCaches();
    return deleted;
  }

  async toggleActive(id: string, isActive?: boolean): Promise<TEntity> {
    if (typeof isActive === 'boolean') {
      return this.update(id, { isActive } as TUpdateDto);
    }
    const current = await this.config.findOneForToggle(id);
    return this.update(id, { isActive: !current.isActive } as TUpdateDto);
  }

  protected async invalidateEntityCache(id: string): Promise<void> {
    await this.cache.del(this.config.getEntityCacheKey(id));
  }
}
