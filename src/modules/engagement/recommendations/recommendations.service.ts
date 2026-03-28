import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../shared/redis/redis.service';
import { RecommendationsEngineService } from './services/recommendations-engine.service';
import { RecommendationsTrackerService } from './services/recommendations-tracker.service';
import { RecommendationsHistoryService } from './services/recommendations-history.service';

/**
 * RecommendationsService — координатор системы рекомендаций и аналитики активности.
 * Делегирует вычисления и хранение специализированным сервисам.
 *
 * Персональный список: кэшируется пул скоров (raw), на каждый запрос — исключение
 * недавно показанных, фильтр качества и диверсификация в движке.
 */
@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly RAW_CACHE_TTL_SEC = 3600; // 1 час
  /** Недавно показанные карточки не повторяем ~48 ч */
  private readonly IMPRESSION_TTL_SEC = 48 * 3600;
  private readonly RAW_CACHE_PREFIX = 'recommendations:raw:v1:';
  private readonly IMPRESSION_PREFIX = 'recommendations:impressions:v1:';
  /** Совместимость: старый ключ полного ответа */
  private readonly LEGACY_CACHE_PREFIX = 'recommendations:';

  constructor(
    private readonly redis: RedisService,
    private readonly engineService: RecommendationsEngineService,
    private readonly trackerService: RecommendationsTrackerService,
    private readonly historyService: RecommendationsHistoryService,
  ) {}

  private identityKey(userId?: string, sessionId?: string): string {
    return userId || sessionId || 'anon';
  }

  /** Учитываем город с клиента (гео/выбор), иначе общий кэш без города. */
  private rawCacheKey(
    userId?: string,
    sessionId?: string,
    explicitCityId?: string,
  ): string {
    const suffix = explicitCityId?.trim() || 'noc';
    return `${this.RAW_CACHE_PREFIX}${this.identityKey(userId, sessionId)}:${suffix}`;
  }

  /** Сброс всех вариантов raw-кэша при смене интересов (город в query меняет ключ). */
  private async deleteAllRawCacheVariants(
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    const id = this.identityKey(userId, sessionId);
    const pattern = `${this.RAW_CACHE_PREFIX}${id}:*`;
    try {
      const client = this.redis.getClient();
      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          50,
        );
        cursor = nextCursor;
        if (keys.length) await client.del(...keys);
      } while (cursor !== '0');
    } catch (e) {
      this.logger.warn('deleteAllRawCacheVariants failed', e);
    }
  }

  private impressionKey(userId?: string, sessionId?: string): string {
    return `${this.IMPRESSION_PREFIX}${this.identityKey(userId, sessionId)}`;
  }

  private legacyCacheKey(userId?: string, sessionId?: string): string {
    return `${this.LEGACY_CACHE_PREFIX}${this.identityKey(userId, sessionId)}`;
  }

  private async getImpressionIds(
    userId?: string,
    sessionId?: string,
  ): Promise<Set<string>> {
    try {
      const key = this.impressionKey(userId, sessionId);
      const ids = await this.redis.getClient().smembers(key);
      return new Set(ids);
    } catch {
      return new Set();
    }
  }

  private async recordShownMasterIds(
    userId: string | undefined,
    sessionId: string | undefined,
    masterIds: string[],
  ): Promise<void> {
    if (!masterIds.length) return;
    try {
      const key = this.impressionKey(userId, sessionId);
      const client = this.redis.getClient();
      await client.sadd(key, ...masterIds);
      await client.expire(key, this.IMPRESSION_TTL_SEC);
    } catch (e) {
      this.logger.warn('recordShownMasterIds failed', e);
    }
  }

  /**
   * Получить персональные рекомендации: raw-скоры в кэше; показы без повторов 48ч.
   */
  async getPersonalizedRecommendations(
    userId?: string,
    sessionId?: string,
    limit: number = 10,
    explicitCityId?: string,
  ): Promise<unknown[]> {
    try {
      const rawKey = this.rawCacheKey(userId, sessionId, explicitCityId);
      let rawJson = await this.redis.getClient().get(rawKey);

      if (!rawJson) {
        const raw = await this.engineService.buildRawScores(
          userId,
          sessionId,
          undefined,
          explicitCityId,
        );
        rawJson = JSON.stringify(raw);
        await this.redis
          .getClient()
          .setex(rawKey, this.RAW_CACHE_TTL_SEC, rawJson);
      }

      const raw = JSON.parse(rawJson) as {
        masterId: string;
        score: number;
        reasons: string[];
      }[];

      const excludeRecent = await this.getImpressionIds(userId, sessionId);
      const recommendations = await this.engineService.materializeFromRawScores(
        raw,
        limit,
        excludeRecent,
      );

      await this.recordShownMasterIds(
        userId,
        sessionId,
        recommendations.map((m) => m.id),
      );

      return recommendations as unknown[];
    } catch (error) {
      this.logger.error('Recommendations error:', error);
      return [];
    }
  }

  /**
   * Получить похожих мастеров
   */
  async getSimilarMasters(masterId: string, limit: number = 5) {
    return this.engineService.getSimilarMasters(masterId, limit);
  }

  /**
   * Получить историю недавно просмотренных
   */
  async getRecentlyViewed(
    userId?: string,
    sessionId?: string,
    limit: number = 10,
  ) {
    return this.historyService.getRecentlyViewed(userId, sessionId, limit);
  }

  /**
   * Отследить действие пользователя и сбросить кэш рекомендаций
   */
  async trackActivity(data: {
    userId?: string;
    sessionId?: string;
    action?: string;
    masterId?: string;
    categoryId?: string;
    cityId?: string;
    searchQuery?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    if (!data.action) {
      this.logger.warn('trackActivity called without action, skipping');
      return;
    }
    try {
      const { action, ...rest } = data;
      await this.trackerService.trackActivity({ ...rest, action });

      const client = this.redis.getClient();
      await this.deleteAllRawCacheVariants(data.userId, data.sessionId);
      await client.del(this.legacyCacheKey(data.userId, data.sessionId));
    } catch (error) {
      this.logger.error('Activity tracking error:', error);
    }
  }
}
