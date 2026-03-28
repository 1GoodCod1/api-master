import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RecommendationsService } from '../recommendations.service';
import {
  ActivityEvent,
  type ActivityTrackedPayload,
} from '../events/activity.events';

/**
 * Слушатель событий активности для системы рекомендаций.
 * Позволяет другим модулям (Masters, Favorites) отправлять данные об активности
 * без прямой зависимости от RecommendationsService.
 */
@Injectable()
export class RecommendationsListener {
  private readonly logger = new Logger(RecommendationsListener.name);

  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  /**
   * Слушатель события отслеживания активности
   */
  @OnEvent(ActivityEvent.TRACKED, { async: true })
  async handleActivityTracked(payload: ActivityTrackedPayload) {
    try {
      await this.recommendationsService.trackActivity(payload);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Activity event handling failed: ${msg}`);
    }
  }
}
