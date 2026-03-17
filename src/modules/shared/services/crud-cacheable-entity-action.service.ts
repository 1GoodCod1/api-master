import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

/**
 * Configuration for cacheable entity CRUD operations.
 * Implement in concrete services to provide entity-specific behavior.
 */
export interface CrudCacheableEntityConfig<
  TEntity extends { id: string; isActive?: boolean },
  TCreateDto,
  TUpdateDto,
> {
  /** Entity name for logging (e.g. "CitiesActionService") */
  entityName: string;
  /** Singular form for error messages (e.g. "город", "категория") */
  entityNameSingular: string;
  /** Accusative for "создать X" (e.g. "город", "категорию") */
  entityNameAccusative: string;
  /** Suffix for NotFoundException (e.g. "не найден", "не найдена") */
  notFoundSuffix: string;
  /** For BadRequest "в котором/которой есть активные мастера" */
  inWhich: string;
  /** Cache key for entity by ID */
  getEntityCacheKey: (id: string) => string;
  /** Invalidate all caches affected by entity changes */
  invalidateGlobalCaches: () => Promise<void>;
  /** Create entity in DB */
  createEntity: (dto: TCreateDto) => Promise<TEntity>;
  /** Update entity in DB */
  updateEntity: (id: string, dto: TUpdateDto) => Promise<TEntity>;
  /** Find entity with masters count for remove validation */
  findWithMastersCount: (
    id: string,
  ) => Promise<{ _count: { masters: number } } | null>;
  /** Delete entity from DB */
  deleteEntity: (id: string) => Promise<TEntity>;
  /** Get current entity for toggleActive (needs isActive) */
  findOneForToggle: (id: string) => Promise<{ isActive: boolean }>;
  /** Ensure entity exists before update (throws NotFoundException) */
  ensureExists: (id: string) => Promise<void>;
}

/**
 * Generic CRUD action service for cacheable entities (cities, categories).
 * Eliminates duplication between CitiesActionService and CategoriesActionService.
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
        `Не удалось создать ${this.config.entityNameAccusative}: ${message}`,
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
      throw new NotFoundException(
        `${name} с ID "${id}" ${this.config.notFoundSuffix}`,
      );
    }

    if (entity._count.masters > 0) {
      throw new BadRequestException(
        `Нельзя удалить ${this.config.entityNameSingular}, ${this.config.inWhich} есть активные мастера`,
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
