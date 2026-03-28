import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import type { CacheKeyBuilders, CacheOptions } from '../types/cache.types';

export type { CacheOptions, CacheKeyBuilders };

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 300; // 5 minutes

  // Защита от Cache Stampede: хранит текущие выполняющиеся запросы
  private readonly inFlightRequests = new Map<string, Promise<unknown>>();

  constructor(private readonly redis: RedisService) {}

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      return await this.redis.get<T>(key);
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null; // Fail silently, fallback to DB
    }
  }

  /**
   * Записать значение в кеш
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const effectiveTtl = ttl || this.defaultTTL;
      await this.redis.set(key, value, effectiveTtl);
      // Регистрация ключа в наборе для инвалидации O(members) без SCAN
      void this.registerKeyInSet(key, effectiveTtl).catch(() => {});
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      // Тихий сбой — не ломаем приложение
    }
  }

  /**
   * Удалить ключ из кеша
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache del error for key ${key}:`, error);
    }
  }

  /**
   * Регистрация ключа кеша в Redis Set для быстрой инвалидации по шаблону.
   * Имя набора — префикс ключа без последнего сегмента.
   *
   * Пример:
   *   key = 'cache:master:abc123:full'
   *   set = 'keyset:cache:master:abc123:*'
   *
   * Вместо SCAN (на 1M+ ключей в проде тяжело) — O(members) DEL.
   */
  private async registerKeyInSet(key: string, dataTtl?: number): Promise<void> {
    try {
      const client = this.redis.getClient();
      // Имя набора отслеживания: префикс ключа (без последнего ':segment')
      const lastColon = key.lastIndexOf(':');
      if (lastColon < 0) return;
      const prefix = key.slice(0, lastColon);
      const setName = `keyset:${prefix}:*`;
      // SADD + expire набора пропорционально TTL данных (мин 1 ч, макс 24 ч)
      const keysetTtl = Math.min(
        Math.max((dataTtl ?? this.defaultTTL) * 2, 3600),
        86400,
      );
      await client.sadd(setName, key);
      await client.expire(setName, keysetTtl);
    } catch {
      // Некритично: при сбое инвалидация уйдёт в SCAN
    }
  }

  /**
   * Удаление ключей по шаблону.
   *
   * Стратегия (по приоритету):
   * 1) Чтение из Redis Set, заполненного при set() — O(members)
   * 2) Иначе SCAN, если набор пуст (холодный старт и т.д.)
   *
   * SCAN — пакетами COUNT=100, чтобы снизить блокировки.
   */
  async delByPattern(pattern: string): Promise<number> {
    try {
      const client = this.redis.getClient();
      const setName = `keyset:${pattern}`;

      // 1) Быстрый путь: реестр key-set
      const keys: string[] = await client.smembers(setName);

      // 2) SCAN для ключей не из реестра (напр. до миграции)
      if (keys.length === 0) {
        let cursor = '0';
        do {
          const [nextCursor, foundKeys] = await client.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            100,
          );
          cursor = nextCursor;
          keys.push(...foundKeys);
        } while (cursor !== '0');
      }

      if (keys.length === 0) return 0;

      // Удаление ключей и набора отслеживания пакетами по 100
      const batchSize = 100;
      let deleted = 0;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await client.del(...batch);
        deleted += batch.length;
      }

      // Удалить исчерпанный набор отслеживания
      await client.del(setName);
      return deleted;
    } catch (error) {
      this.logger.error(
        `Cache delByPattern error for pattern ${pattern}:`,
        error,
      );
      return 0;
    }
  }

  /** Временные ошибки БД/пула — имеет смысл один ретрай */
  private isRetryableConnectionError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      /connection timeout/i.test(msg) ||
      /connection terminated/i.test(msg) ||
      /ECONNRESET|ECONNREFUSED|ETIMEDOUT/i.test(msg)
    );
  }

  /**
   * Cache-aside: get или вычислить и положить.
   * Один повтор fetch при временной ошибке соединения с БД (таймаут пула и т.п.).
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Пробуем взять из кеша
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Защита от cache stampede (singleflight)
    // Если другой запрос уже вычисляет значение для этого ключа — ждём его
    const inFlightPromise = this.inFlightRequests.get(key) as
      | Promise<T>
      | undefined;
    if (inFlightPromise) {
      this.logger.debug(
        `Cache Stampede blocked for key: ${key} (awaiting in-flight promise)`,
      );
      return inFlightPromise;
    }

    const promise: Promise<T> = (async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const value = await fetchFn();
          await this.redis.set(key, value, ttl || this.defaultTTL);
          void this.registerKeyInSet(key, ttl).catch(() => {}); // для инвалидации через наборы
          return value;
        } catch (error) {
          lastError = error;
          if (attempt === 0 && this.isRetryableConnectionError(error)) {
            this.logger.warn(
              `Cache getOrSet retry after connection error: ${error instanceof Error ? error.message : error}`,
            );
            continue;
          }
          throw error;
        }
      }
      throw lastError;
    })();

    // Сохраняем промис ДО его завершения
    this.inFlightRequests.set(key, promise as Promise<unknown>);

    try {
      return await promise;
    } finally {
      // Всегда удаляем промис из карты после завершения (успех или ошибка)
      this.inFlightRequests.delete(key);
    }
  }

  /**
   * Invalidate cache by pattern.
   *
   * @param pattern - Redis glob pattern (e.g. `cache:master:123:*`).
   *   Note: pattern `cache:xyz:all:*` matches keys like `cache:xyz:all:{"filter":true}`,
   *   but NOT the leaf key `cache:xyz:all` (no trailing segment).
   *   For leaf keys use del() or invalidateWithLeafKey().
   */
  async invalidate(pattern: string): Promise<number> {
    return this.delByPattern(pattern);
  }

  /**
   * Инвалидация по шаблону и удаление листового ключа, который шаблоном не покрывается.
   * Когда есть и лист (`cache:categories:all`), и ключи с суффиксами.
   *
   * @param leafKey — точный ключ (напр. cache.keys.categoriesAll())
   * @param pattern — шаблон для ключей с подсегментами
   * @returns число удалённых по шаблону
   */
  async invalidateWithLeafKey(
    leafKey: string,
    pattern: string,
  ): Promise<number> {
    const [, patternDeleted] = await Promise.all([
      this.del(leafKey),
      this.invalidate(pattern),
    ]);
    return patternDeleted;
  }

  /**
   * Standard invalidation patterns. Use these for consistency.
   *
   * When to use del() vs invalidate():
   * - del(key): For a single known key (e.g. cache.keys.masterFull(id))
   * - invalidate(pattern): For multiple keys matching a pattern (e.g. cache:search:masters:*)
   * - invalidateWithLeafKey(leaf, pattern): When you have both a leaf key and prefixed keys
   */
  readonly patterns = {
    master: (masterId: string) => `cache:master:${masterId}:*`,
    masterLeads: (masterId: string) => `cache:master:${masterId}:leads:*`,
    masterReviews: (masterId: string) => `cache:master:${masterId}:reviews:*`,
    clientWrittenReviews: (userId: string) =>
      `cache:user:${userId}:written-reviews:*`,
    searchMasters: () => 'cache:search:masters:*',
    mastersTop: () => 'cache:masters:top:*',
    mastersPopular: () => 'cache:masters:popular:*',
    mastersNew: () => 'cache:masters:new:*',
    categoriesAll: () => 'cache:categories:all:*',
    categoriesStatistics: () => 'cache:categories:statistics:*',
    citiesAll: () => 'cache:cities:all:*',
    tariffsAll: () => 'cache:tariffs:all:*',
    promotions: () => 'cache:promotions:*',
  } as const;

  /**
   * Полная инвалидация кеша, связанного с мастером (профиль, поиск, топы).
   * Параллельно. При изменении профиля/данных мастера.
   *
   * @param masterId — ID мастера
   * @param slugs — старый/новый slug для ключей по slug
   */
  async invalidateMasterRelated(
    masterId: string,
    slugs?: { old?: string | null; new?: string | null },
  ): Promise<void> {
    const tasks: Promise<unknown>[] = [
      this.del(this.keys.masterFull(masterId)),
      this.del(this.keys.masterStats(masterId)),
      this.invalidate(this.patterns.master(masterId)),
      this.invalidate(this.patterns.searchMasters()),
      this.invalidate(this.patterns.mastersTop()),
      this.invalidate(this.patterns.mastersPopular()),
      this.invalidate(this.patterns.mastersNew()),
      this.del(this.keys.searchFilters()),
    ];
    if (slugs?.old) tasks.push(this.del(this.keys.masterFull(slugs.old)));
    if (slugs?.new && slugs.new !== slugs.old) {
      tasks.push(this.del(this.keys.masterFull(slugs.new)));
    }
    await Promise.all(tasks);
  }

  /**
   * Лёгкая инвалидация (лиды, stats). Без поиска/топов/popular/new.
   */
  async invalidateMasterData(masterId: string): Promise<void> {
    await Promise.all([
      this.del(this.keys.masterStats(masterId)),
      this.invalidate(this.patterns.master(masterId)),
    ]);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = this.redis.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * TTL ключа
   */
  async getTTL(key: string): Promise<number> {
    try {
      const client = this.redis.getClient();
      return await client.ttl(key);
    } catch (error) {
      this.logger.error(`Cache getTTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Инкремент счётчика
   */
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const value = await this.redis.incr(key);
      if (ttl && value === 1) {
        // TTL только при первом инкременте
        await this.redis.expire(key, ttl);
      }
      return value;
    } catch (error) {
      this.logger.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Собрать ключ кеша с префиксом
   */
  buildKey(
    parts: (string | number | null | undefined)[],
    prefix?: string,
  ): string {
    const filtered = parts.filter((p) => p !== null && p !== undefined);
    const key = filtered.join(':');
    return prefix ? `${prefix}:${key}` : key;
  }

  /**
   * Построители ключей для типовых сценариев
   */
  readonly keys: CacheKeyBuilders = {
    // Поиск
    searchMasters: (params: {
      categoryId?: string | null;
      cityId?: string | null;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
      search?: string | null;
      tariffType?: string | null;
      minRating?: number | null;
      isFeatured?: boolean | null;
      minPrice?: number | null;
      maxPrice?: number | null;
      availableNow?: boolean | null;
      hasPromotion?: boolean | null;
    }) => {
      return this.buildKey([
        'cache',
        'search',
        'masters',
        params.categoryId || 'null',
        params.cityId || 'null',
        params.page || 1,
        params.limit || 20,
        params.sortBy || 'rating',
        params.sortOrder || 'desc',
        params.search || 'null',
        params.tariffType || 'null',
        params.minRating || 'null',
        params.isFeatured !== undefined && params.isFeatured !== null
          ? String(params.isFeatured)
          : 'null',
        params.minPrice != null ? String(params.minPrice) : 'null',
        params.maxPrice != null ? String(params.maxPrice) : 'null',
        params.availableNow != null ? String(params.availableNow) : 'null',
        params.hasPromotion != null ? String(params.hasPromotion) : 'null',
      ]);
    },

    // Профиль мастера
    masterFull: (idOrSlug: string) =>
      this.buildKey(['cache', 'master', idOrSlug, 'full']),

    masterStats: (id: string) =>
      this.buildKey(['cache', 'master', id, 'stats']),

    masterReviews: (id: string, page: number, limit: number, status?: string) =>
      this.buildKey([
        'cache',
        'master',
        id,
        'reviews',
        status || 'all',
        'page',
        page,
        'limit',
        limit,
      ]),

    clientWrittenReviews: (
      userId: string,
      page: number,
      limit: number,
      status?: string,
    ) =>
      this.buildKey([
        'cache',
        'user',
        userId,
        'written-reviews',
        status || 'all',
        'page',
        page,
        'limit',
        limit,
      ]),

    // Категории
    categoriesAll: () => this.buildKey(['cache', 'categories', 'all']),

    categoryWithStats: (id: string) =>
      this.buildKey(['cache', 'category', id, 'with-stats']),

    // Города
    citiesAll: () => this.buildKey(['cache', 'cities', 'all']),

    cityWithStats: (id: string) =>
      this.buildKey(['cache', 'city', id, 'with-stats']),

    // Тарифы
    tariffsAll: () => this.buildKey(['cache', 'tariffs', 'all']),

    tariffById: (id: string) => this.buildKey(['cache', 'tariff', id]),

    tariffByType: (type: string) =>
      this.buildKey(['cache', 'tariff', 'type', type]),

    // Заявки (лиды)
    masterLeads: (masterId: string, status: string | null, page: number) =>
      this.buildKey([
        'cache',
        'master',
        masterId,
        'leads',
        'status',
        status || 'null',
        'page',
        page,
      ]),

    // Пользователь
    userProfile: (id: string) =>
      this.buildKey(['cache', 'user', id, 'profile']),

    userMasterProfile: (id: string) =>
      this.buildKey(['cache', 'user', id, 'master-profile']),

    // Аналитика
    analytics: (masterId: string, period: string, type: string) =>
      this.buildKey(['cache', 'analytics', 'master', masterId, period, type]),

    // Топ мастеров
    topMasters: (
      categoryId: string | null,
      cityId: string | null,
      limit: number,
    ) =>
      this.buildKey([
        'cache',
        'masters',
        'top',
        categoryId || 'null',
        cityId || 'null',
        limit,
      ]),

    // Популярные мастера
    popularMasters: (limit: number) =>
      this.buildKey(['cache', 'masters', 'popular', limit]),

    // Новые мастера
    newMasters: (limit: number) =>
      this.buildKey(['cache', 'masters', 'new', limit]),

    // Подсказки поиска (автодополнение)
    searchSuggest: (q: string, cityId: string | null) =>
      this.buildKey([
        'cache',
        'suggest',
        q.toLowerCase().slice(0, 50),
        cityId || 'null',
      ]),

    // Фильтры поиска (v2: slug/value для i18n)
    searchFilters: () =>
      this.buildKey(['cache', 'masters', 'search-filters', 'v2']),
  };

  /**
   * Константы TTL
   */
  ttl = {
    search: 300, // 5 мин
    masterProfile: 180, // 3 мин
    masterStats: 300, // 5 мин
    reviews: 900, // 15 мин
    categories: 3600, // 1 ч
    cities: 7200, // 2 ч
    tariffs: 86400, // 24 ч
    leads: 120, // 2 мин
    userProfile: 900, // 15 мин
    analyticsDay: 600, // 10 мин
    analyticsWeek: 1800, // 30 мин
    analyticsMonth: 3600, // 1 ч
    topMasters: 600, // 10 мин
    popularMasters: 600, // 10 мин
    newMasters: 180, // 3 мин
    searchFilters: 3600, // 1 ч
    landingStats: 600, // 10 мин
    notifications: 60, // 1 мин (часто меняется)
  };
}
