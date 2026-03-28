/**
 * Конфигурация CRUD для сущностей с инвалидацией кеша.
 * Реализуется в конкретных сервисах (города, категории и т.п.).
 */
export interface CrudCacheableEntityConfig<
  TEntity extends { id: string; isActive?: boolean },
  TCreateDto,
  TUpdateDto,
> {
  /** Имя для логов (например CitiesActionService) */
  entityName: string;
  /** Единственное число для текстов ошибок на англ. (city, category) */
  entityNameSingular: string;
  /** Для сообщения об ошибке create в логе (на англ., напр. category) */
  entityNameAccusative: string;
  /** Ключ кеша сущности по ID */
  getEntityCacheKey: (id: string) => string;
  /** Инвалидация всех кешей, затронутых изменениями сущности */
  invalidateGlobalCaches: () => Promise<void>;
  /** Создание в БД */
  createEntity: (dto: TCreateDto) => Promise<TEntity>;
  /** Обновление в БД */
  updateEntity: (id: string, dto: TUpdateDto) => Promise<TEntity>;
  /** Загрузка сущности с числом мастеров (для проверки перед удалением) */
  findWithMastersCount: (
    id: string,
  ) => Promise<{ _count: { masters: number } } | null>;
  /** Удаление из БД */
  deleteEntity: (id: string) => Promise<TEntity>;
  /** Текущая сущность для toggleActive (нужен isActive) */
  findOneForToggle: (id: string) => Promise<{ isActive: boolean }>;
  /** Проверка существования перед update (иначе NotFoundException) */
  ensureExists: (id: string) => Promise<void>;
}
