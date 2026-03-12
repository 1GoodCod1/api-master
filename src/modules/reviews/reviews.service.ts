import { Injectable } from '@nestjs/common';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ReviewsActionService } from './services/reviews-action.service';
import { ReviewsQueryService } from './services/reviews-query.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewStatus } from '@prisma/client';

/**
 * ReviewsService — координатор модуля отзывов.
 * Управляет процессами создания, выборки и модерации через специализированные сервисы.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly actionService: ReviewsActionService,
    private readonly queryService: ReviewsQueryService,
  ) {}

  /**
   * Оставить новый отзыв о мастере
   */
  async create(
    createReviewDto: CreateReviewDto,
    clientId: string,
    authUser?: JwtUser | null,
  ) {
    return this.actionService.create(createReviewDto, clientId, authUser);
  }

  /**
   * Получить список всех отзывов мастера с cursor-based пагинацией
   */
  async findAllForMaster(
    masterId: string,
    options: {
      status?: string;
      statusIn?: ReviewStatus[];
      limit?: number;
      cursor?: string;
      page?: number;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    return this.queryService.findAllForMaster(masterId, options);
  }

  /**
   * Обновить статус отзыва (подтвердить, скрыть и т.д.)
   */
  async updateReviewStatus(
    id: string,
    status: ReviewStatus,
    moderatedBy?: string,
  ) {
    return this.actionService.updateStatus(id, status, moderatedBy);
  }

  /**
   * Проверить, имеет ли право клиент оставить отзыв мастеру сейчас
   */
  async canCreateReview(masterId: string, clientId: string) {
    return this.queryService.canCreateReview(masterId, clientId);
  }

  /**
   * Получить общую статистику отзывов
   */
  async getStats(masterId: string) {
    return this.queryService.getStats(masterId);
  }

  /**
   * Пересчитать рейтинг мастера
   */
  async updateMasterRating(masterId: string) {
    return this.actionService.updateMasterRating(masterId);
  }

  // ============================================
  // REVIEW REPLIES
  // ============================================

  /**
   * Ответить на отзыв (мастер)
   */
  async replyToReview(reviewId: string, masterId: string, content: string) {
    return this.actionService.replyToReview(reviewId, masterId, content);
  }

  /**
   * Удалить ответ на отзыв
   */
  async deleteReply(reviewId: string, masterId: string) {
    return this.actionService.deleteReply(reviewId, masterId);
  }

  // ============================================
  // REVIEW VOTES
  // ============================================

  /**
   * Голосование "полезный отзыв"
   */
  async voteHelpful(reviewId: string, userId: string) {
    return this.actionService.voteHelpful(reviewId, userId);
  }

  /**
   * Убрать голос
   */
  async removeVote(reviewId: string, userId: string) {
    return this.actionService.removeVote(reviewId, userId);
  }
}
