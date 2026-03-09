import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../shared/redis/redis.service';
import { RecommendationsEngineService } from './services/recommendations-engine.service';
import { RecommendationsTrackerService } from './services/recommendations-tracker.service';
import { RecommendationsHistoryService } from './services/recommendations-history.service';

/**
 * RecommendationsService — координатор системы рекомендаций и аналитики активности.
 * Делегирует вычисления и хранение специализированным сервисам.
 */
@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly CACHE_TTL = 3600; // 1 час

  constructor(
    private readonly redis: RedisService,
    private readonly engineService: RecommendationsEngineService,
    private readonly trackerService: RecommendationsTrackerService,
    private readonly historyService: RecommendationsHistoryService,
  ) {}

  /**
   * Получить персональные рекомендации с использованием кэширования
   */
  async getPersonalizedRecommendations(
    userId?: string,
    sessionId?: string,
    limit: number = 10,
  ): Promise<unknown[]> {
    const cacheKey = `recommendations:${userId || sessionId || 'anon'}`;

    try {
      const cached = await this.redis.getClient().get(cacheKey);
      if (cached) return JSON.parse(cached) as unknown[];

      const recommendations = await this.engineService.calculateScores(
        userId,
        sessionId,
        limit,
      );

      await this.redis
        .getClient()
        .setex(cacheKey, this.CACHE_TTL, JSON.stringify(recommendations));
      return recommendations as unknown[];
    } catch (error) {
      this.logger.error('Error in recommendations:', error);
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

      // Сбрасываем кэш, так как интересы пользователя могли измениться
      const cacheKey = `recommendations:${data.userId || data.sessionId || 'anon'}`;
      await this.redis.getClient().del(cacheKey);
    } catch (error) {
      this.logger.error('Failed to track activity:', error);
    }
  }
}
