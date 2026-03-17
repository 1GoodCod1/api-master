import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { ReviewsActionService } from './services/reviews-action.service';
import { ReviewsQueryService } from './services/reviews-query.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewStatus } from '@prisma/client';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface FindReviewsOptions {
  status?: string;
  statusIn?: ReviewStatus[];
  limit?: string;
  cursor?: string;
  page?: string;
  sortOrder?: 'asc' | 'desc';
}

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
   * Получить список всех отзывов мастера с cursor-based пагинацией.
   * Парсит limit/page из query-параметров.
   */
  async findAllForMaster(masterId: string, options: FindReviewsOptions = {}) {
    const { limit, page, ...rest } = options;
    return this.queryService.findAllForMaster(masterId, {
      ...rest,
      limit: this.parseLimit(limit),
      page: this.parsePage(page),
    });
  }

  /**
   * Обновить статус отзыва (подтвердить, скрыть и т.д.).
   * Валидирует и нормализует статус.
   */
  async updateReviewStatus(id: string, statusRaw: string, moderatedBy: string) {
    const status = this.parseAndValidateStatus(statusRaw);
    return this.actionService.updateStatus(id, status, moderatedBy);
  }

  /**
   * Проверить, имеет ли право клиент оставить отзыв мастеру сейчас
   */
  async canCreateReview(masterId: string, clientId: string) {
    return this.queryService.canCreateReview(masterId, clientId);
  }

  /**
   * Получить статистику отзывов.
   * ADMIN может запросить любого мастера, MASTER — только своего.
   */
  async getStatsForUser(masterId: string, user: JwtUser) {
    const resolvedMasterId =
      user.role === 'ADMIN' ? masterId : user.masterProfile?.id;
    if (!resolvedMasterId) {
      throw new ForbiddenException('Master profile not found');
    }
    return this.queryService.getStats(resolvedMasterId);
  }

  /**
   * Получить отзывы для авторизованного мастера (его собственные).
   */
  async getMyReviews(user: JwtUser, options: FindReviewsOptions = {}) {
    const masterId = user.masterProfile?.id;
    if (!masterId) {
      throw new BadRequestException('Master profile not found');
    }
    const { limit, page, ...rest } = options;
    return this.queryService.findAllForMaster(masterId, {
      ...rest,
      statusIn: [ReviewStatus.PENDING, ReviewStatus.VISIBLE],
      limit: this.parseLimit(limit),
      page: this.parsePage(page),
    });
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
   * Ответить на отзыв (мастер). Извлекает masterId из контекста пользователя.
   */
  async replyToReview(reviewId: string, user: JwtUser, content: string) {
    const masterId = user.masterProfile?.id;
    if (!masterId) {
      throw new BadRequestException('Master profile not found');
    }
    return this.actionService.replyToReview(reviewId, masterId, content);
  }

  /**
   * Удалить ответ на отзыв. Извлекает masterId из контекста пользователя.
   */
  async deleteReply(reviewId: string, user: JwtUser) {
    const masterId = user.masterProfile?.id;
    if (!masterId) {
      throw new BadRequestException('Master profile not found');
    }
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

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private parseLimit(limit?: string): number {
    if (!limit) return DEFAULT_LIMIT;
    const num = Number(limit) || DEFAULT_LIMIT;
    return Math.min(MAX_LIMIT, Math.max(1, num));
  }

  private parsePage(page?: string): number | undefined {
    if (!page) return undefined;
    const num = Number(page);
    return Number.isNaN(num) ? undefined : num;
  }

  private parseAndValidateStatus(statusRaw: string): ReviewStatus {
    const status = statusRaw.toUpperCase() as ReviewStatus;
    if (!Object.values(ReviewStatus).includes(status)) {
      throw new BadRequestException(`Invalid status: ${statusRaw}`);
    }
    return status;
  }
}
