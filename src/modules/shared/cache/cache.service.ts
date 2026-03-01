import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 300; // 5 minutes

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
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.redis.set(key, value, ttl || this.defaultTTL);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      // Fail silently, don't break the application
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache del error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   * WARNING: Использует SCAN вместо KEYS для избежания блокировки Redis в продакшене
   */
  async delByPattern(pattern: string): Promise<number> {
    try {
      const client = this.redis.getClient();
      const keys: string[] = [];
      let cursor = '0';

      // Используем SCAN вместо KEYS для неблокирующей операции
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

      if (keys.length === 0) return 0;

      // Delete in batches of 100 to avoid blocking Redis
      const batchSize = 100;
      let deleted = 0;

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await Promise.all(batch.map((key) => this.redis.del(key)));
        deleted += batch.length;
      }

      return deleted;
    } catch (error) {
      this.logger.error(
        `Cache delByPattern error for pattern ${pattern}:`,
        error,
      );
      return 0;
    }
  }

  /** Detect transient DB/pool errors that are worth retrying once */
  private isRetryableConnectionError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      /connection timeout/i.test(msg) ||
      /connection terminated/i.test(msg) ||
      /ECONNRESET|ECONNREFUSED|ETIMEDOUT/i.test(msg)
    );
  }

  /**
   * Get or set pattern (cache-aside)
   * Retries fetch once on transient DB connection errors (e.g. pool timeout).
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const value = await fetchFn();
        await this.set(key, value, ttl);
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
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<number> {
    return this.delByPattern(pattern);
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
   * Get TTL for key
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
   * Increment counter
   */
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const value = await this.redis.incr(key);
      if (ttl && value === 1) {
        // Set TTL only on first increment
        await this.redis.expire(key, ttl);
      }
      return value;
    } catch (error) {
      this.logger.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Build cache key with prefix
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
   * Cache key builders for common patterns
   */
  keys = {
    // Search
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

    // Master profile
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

    // Categories
    categoriesAll: () => this.buildKey(['cache', 'categories', 'all']),

    categoryWithStats: (id: string) =>
      this.buildKey(['cache', 'category', id, 'with-stats']),

    // Cities
    citiesAll: () => this.buildKey(['cache', 'cities', 'all']),

    cityWithStats: (id: string) =>
      this.buildKey(['cache', 'city', id, 'with-stats']),

    // Tariffs
    tariffsAll: () => this.buildKey(['cache', 'tariffs', 'all']),

    tariffById: (id: string) => this.buildKey(['cache', 'tariff', id]),

    tariffByType: (type: string) =>
      this.buildKey(['cache', 'tariff', 'type', type]),

    // Leads
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

    // User
    userProfile: (id: string) =>
      this.buildKey(['cache', 'user', id, 'profile']),

    userMasterProfile: (id: string) =>
      this.buildKey(['cache', 'user', id, 'master-profile']),

    // Analytics
    analytics: (masterId: string, period: string, type: string) =>
      this.buildKey(['cache', 'analytics', 'master', masterId, period, type]),

    // Top masters
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

    // Popular masters
    popularMasters: (limit: number) =>
      this.buildKey(['cache', 'masters', 'popular', limit]),

    // New masters
    newMasters: (limit: number) =>
      this.buildKey(['cache', 'masters', 'new', limit]),

    // Search filters (v2: includes slug/value for i18n)
    searchFilters: () =>
      this.buildKey(['cache', 'masters', 'search-filters', 'v2']),
  };

  /**
   * TTL constants
   */
  ttl = {
    search: 300, // 5 minutes
    masterProfile: 600, // 10 minutes
    masterStats: 300, // 5 minutes
    reviews: 900, // 15 minutes
    categories: 3600, // 1 hour
    cities: 7200, // 2 hours
    tariffs: 86400, // 24 hours
    leads: 120, // 2 minutes
    userProfile: 900, // 15 minutes
    analyticsDay: 600, // 10 minutes
    analyticsWeek: 1800, // 30 minutes
    analyticsMonth: 3600, // 1 hour
    topMasters: 600, // 10 minutes
    popularMasters: 600, // 10 minutes
    newMasters: 300, // 5 minutes
    searchFilters: 3600, // 1 hour
    landingStats: 600, // 10 minutes
    notifications: 60, // 1 minute (frequently changing)
  };
}
