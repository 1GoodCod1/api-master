import { Injectable } from '@nestjs/common';
import {
  AppErrors,
  AppErrorMessages,
  AppErrorTemplates,
} from '../../../common/errors';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { ReviewsActionService } from './services/reviews-action.service';
import { ReviewsQueryService } from './services/reviews-query.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewStatus, UserRole } from '@prisma/client';
import {
  REVIEWS_LIST_DEFAULT_LIMIT,
  REVIEWS_LIST_MAX_LIMIT,
} from '../../../common/constants';
import { parseLimit, parsePage } from '../../../common/utils/pagination.util';
import type { FindReviewsOptions } from './types';
export type { FindReviewsOptions } from './types';

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
      limit: parseLimit(
        limit,
        REVIEWS_LIST_DEFAULT_LIMIT,
        REVIEWS_LIST_MAX_LIMIT,
      ),
      page: parsePage(page),
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
      user.role === UserRole.ADMIN ? masterId : user.masterProfile?.id;
    if (!resolvedMasterId) {
      throw AppErrors.forbidden(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    }
    return this.queryService.getStats(resolvedMasterId);
  }

  /**
   * Мастер: отзывы о нём (ожидающие и опубликованные).
   * Клиент: отзывы, которые он сам оставил мастерам.
   */
  async getMyReviews(user: JwtUser, options: FindReviewsOptions = {}) {
    const { limit, page, ...rest } = options;
    const parsedLimit = parseLimit(
      limit,
      REVIEWS_LIST_DEFAULT_LIMIT,
      REVIEWS_LIST_MAX_LIMIT,
    );
    const parsedPage = parsePage(page);

    if (user.role === UserRole.CLIENT) {
      return this.queryService.findAllForClient(user.id, {
        ...rest,
        limit: parsedLimit,
        page: parsedPage,
      });
    }

    const masterId = user.masterProfile?.id;
    if (!masterId) {
      throw AppErrors.badRequest(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    }
    return this.queryService.findAllForMaster(masterId, {
      ...rest,
      statusIn: [ReviewStatus.PENDING, ReviewStatus.VISIBLE],
      limit: parsedLimit,
      page: parsedPage,
    });
  }

  /**
   * Пересчитать рейтинг мастера
   */
  async updateMasterRating(masterId: string) {
    return this.actionService.updateMasterRating(masterId);
  }

  // ============================================
  // ОТВЕТЫ НА ОТЗЫВЫ
  // ============================================

  /**
   * Ответить на отзыв (мастер). Извлекает masterId из контекста пользователя.
   */
  async replyToReview(reviewId: string, user: JwtUser, content: string) {
    const masterId = user.masterProfile?.id;
    if (!masterId) {
      throw AppErrors.badRequest(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    }
    return this.actionService.replyToReview(reviewId, masterId, content);
  }

  /**
   * Удалить ответ на отзыв. Извлекает masterId из контекста пользователя.
   */
  async deleteReply(reviewId: string, user: JwtUser) {
    const masterId = user.masterProfile?.id;
    if (!masterId) {
      throw AppErrors.badRequest(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    }
    return this.actionService.deleteReply(reviewId, masterId);
  }

  // ============================================
  // ГОЛОСА
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
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ============================================

  private parseAndValidateStatus(statusRaw: string): ReviewStatus {
    const status = statusRaw.toUpperCase() as ReviewStatus;
    if (!Object.values(ReviewStatus).includes(status)) {
      throw AppErrors.badRequest(
        AppErrorTemplates.invalidReviewStatus(statusRaw),
      );
    }
    return status;
  }
}
