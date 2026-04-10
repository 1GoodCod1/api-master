import { Injectable, Logger } from '@nestjs/common';
import {
  AppErrors,
  AppErrorMessages,
  AppErrorTemplates,
} from '../../../../common/errors';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { NotificationsInAppFacade } from '../../../notifications/notifications/facades/notifications-in-app.facade';
import { NotificationsOutboundFacade } from '../../../notifications/notifications/facades/notifications-outbound.facade';
import { CreateReviewDto } from '../dto/create-review.dto';
import type { ReviewCriteriaDto } from '../dto/review-criteria.dto';
import {
  LeadStatus,
  NotificationCategory,
  ReviewStatus,
} from '../../../../common/constants';
import { UserRole } from '@prisma/client';
import { fireAndForget } from '../../../../common/utils/fire-and-forget';

@Injectable()
export class ReviewsActionService {
  private readonly logger = new Logger(ReviewsActionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly inAppNotifications: NotificationsInAppFacade,
    private readonly notificationsOutbound: NotificationsOutboundFacade,
  ) {}

  /**
   * Создать новый отзыв
   * @param createReviewDto Данные отзыва
   * @param clientId ID клиента
   * @param authUser Объект авторизованного пользователя
   */
  async create(
    createReviewDto: CreateReviewDto,
    clientId: string,
    authUser?: JwtUser | null,
  ) {
    const { masterId, leadId, rating, criteria, fileIds } = createReviewDto;

    const user = await this.prisma.user.findUnique({ where: { id: clientId } });
    if (!user?.phone) {
      throw AppErrors.badRequest(AppErrorMessages.REVIEW_USER_PHONE_MISSING);
    }

    if (authUser?.role === UserRole.CLIENT && !authUser.phoneVerified) {
      throw AppErrors.forbidden(AppErrorMessages.REVIEW_PHONE_REQUIRED);
    }

    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      include: { user: { select: { phone: true } } },
    });
    if (!master) throw AppErrors.notFound(AppErrorMessages.MASTER_NOT_FOUND);

    // Проверка на дубликат (один отзыв на мастера от клиента)
    const existingReview = await this.prisma.review.findFirst({
      where: { masterId, clientId },
    });
    if (existingReview) {
      throw AppErrors.badRequest(AppErrorMessages.REVIEW_ALREADY_MASTER);
    }

    // Валидация leadId: лид принадлежит клиенту, имеет правильный статус, нет дубликата
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        masterId: true,
        clientId: true,
        clientPhone: true,
        status: true,
        clientName: true,
      },
    });

    if (!lead) {
      throw AppErrors.badRequest(AppErrorMessages.REVIEW_LEAD_NOT_FOUND);
    }
    const phoneMatches =
      Boolean(user.phone?.trim() && lead.clientPhone?.trim()) &&
      user.phone.trim() === lead.clientPhone.trim();
    const isLeadOwner =
      lead.clientId === clientId || (lead.clientId == null && phoneMatches);
    if (!isLeadOwner) {
      throw AppErrors.forbidden(AppErrorMessages.REVIEW_LEAD_OTHER_CLIENT);
    }
    if (lead.masterId !== masterId) {
      throw AppErrors.badRequest(AppErrorMessages.REVIEW_LEAD_OTHER_MASTER);
    }
    if (lead.status !== LeadStatus.CLOSED) {
      throw AppErrors.badRequest(AppErrorMessages.REVIEW_LEAD_CLOSED_ONLY);
    }

    // Проверка: отзыв на этот лид уже написан
    const reviewForLead = await this.prisma.review.findUnique({
      where: { leadId },
    });
    if (reviewForLead) {
      throw AppErrors.badRequest(AppErrorMessages.REVIEW_LEAD_DUPLICATE);
    }

    // Валидация критериев
    this.validateCriteria(criteria);

    const safeFileIds = fileIds?.length
      ? fileIds.slice(0, 5).filter(Boolean)
      : [];
    let displayName =
      createReviewDto.clientName?.trim() || lead.clientName?.trim() || null;
    if (!displayName && user) {
      const full = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (full) displayName = full;
    }

    const review = await this.prisma.review.create({
      data: {
        masterId,
        clientId,
        leadId,
        clientPhone: user.phone,
        clientName: displayName,
        rating,
        comment: createReviewDto.comment,
        status: ReviewStatus.PENDING,
        reviewCriteria:
          criteria && criteria.length > 0
            ? {
                createMany: {
                  data: criteria.map((c) => ({
                    criteria: c.criteria,
                    rating: c.rating,
                  })),
                },
              }
            : undefined,
        reviewFiles:
          safeFileIds.length > 0
            ? { create: safeFileIds.map((fileId) => ({ fileId })) }
            : undefined,
      },
      include: {
        reviewCriteria: true,
        reviewFiles: {
          include: {
            file: {
              select: { id: true, path: true, mimetype: true, filename: true },
            },
          },
        },
      },
    });

    await this.updateMasterRating(masterId);
    await this.invalidateMasterCache(masterId);
    await this.invalidateClientWrittenReviewsCache(clientId);

    // In-app уведомление мастеру о новом отзыве
    await this.inAppNotifications
      .notifyNewReview(master.userId, {
        reviewId: review.id,
        rating,
        authorName: displayName || undefined,
        masterId,
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Failed to send in-app review notification: ${msg}`);
      });

    // SMS, Telegram, WhatsApp мастеру о новом отзыве
    const comment = createReviewDto.comment ?? '';
    const reviewMsg = `Новый отзыв от ${displayName || 'клиента'}: ${rating}/5. ${comment.substring(0, 80)}${comment.length > 80 ? '...' : ''}`;
    if (master.user?.phone) {
      await this.notificationsOutbound
        .sendSMS(master.user.phone, reviewMsg)
        .catch((e) => {
          this.logger.warn(
            `Failed to send review SMS: ${e instanceof Error ? e.message : e}`,
          );
        });
    }
    if (master.telegramChatId) {
      await this.notificationsOutbound
        .sendTelegram(`⭐ ${reviewMsg}`, { chatId: master.telegramChatId })
        .catch((e) => {
          this.logger.warn(
            `Failed to send review Telegram: ${e instanceof Error ? e.message : e}`,
          );
        });
    }
    if (master.whatsappPhone) {
      await this.notificationsOutbound
        .sendWhatsApp(master.whatsappPhone, `⭐ ${reviewMsg}`)
        .catch((e) => {
          this.logger.warn(
            `Failed to send review WhatsApp: ${e instanceof Error ? e.message : e}`,
          );
        });
    }

    return review;
  }

  /**
   * Обновить статус отзыва (Модерация)
   * @param id ID отзыва
   * @param status Новый статус
   * @param moderatedBy ID администратора
   */
  async updateStatus(id: string, status: ReviewStatus, moderatedBy?: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw AppErrors.notFound(AppErrorMessages.REVIEW_NOT_FOUND);

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        status,
        moderatedBy,
        moderatedAt: new Date(),
      },
    });

    if (status === ReviewStatus.VISIBLE) {
      await this.updateMasterRating(review.masterId);
    }

    await this.invalidateMasterCache(review.masterId);
    await this.invalidateClientWrittenReviewsCache(review.clientId);

    // Уведомить мастера об изменении статуса — фронт инвалидирует Reviews
    const master = await this.prisma.master.findUnique({
      where: { id: review.masterId },
      select: { userId: true },
    });
    if (master) {
      const statusMsg =
        status === ReviewStatus.VISIBLE
          ? 'Одобрен и опубликован'
          : status === ReviewStatus.HIDDEN
            ? 'Скрыт'
            : status === ReviewStatus.REPORTED
              ? 'На модерации'
              : String(status);
      fireAndForget(
        this.inAppNotifications.notify({
          userId: master.userId,
          category: NotificationCategory.NEW_REVIEW,
          title: 'Статус отзыва обновлён',
          message: `Отзыв — ${statusMsg}`,
          messageKey: 'notifications.messages.reviewStatusUpdated',
          messageParams: { status: statusMsg },
          metadata: { reviewId: id, status },
        }),
        this.logger,
        'reviewStatusUpdated notification',
      );
    }

    return updatedReview;
  }

  /**
   * Рассчитать и обновить средний рейтинг мастера
   * @param masterId ID мастера
   */
  async updateMasterRating(masterId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { masterId, status: ReviewStatus.VISIBLE },
    });

    if (reviews.length === 0) {
      await this.prisma.master.update({
        where: { id: masterId },
        data: { rating: 0, totalReviews: 0 },
      });
      return;
    }

    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await this.prisma.master.update({
      where: { id: masterId },
      data: {
        rating: avgRating,
        totalReviews: reviews.length,
      },
    });
  }

  /**
   * Проверить валидность переданных критериев оценки
   * @param criteria Массив критериев
   */
  private validateCriteria(criteria?: ReviewCriteriaDto[]) {
    if (!criteria || criteria.length === 0) return;
    const validCriteria = ['quality', 'speed', 'price', 'politeness'];
    for (const crit of criteria) {
      if (!validCriteria.includes(crit.criteria)) {
        throw AppErrors.badRequest(
          AppErrorTemplates.invalidCriterion(crit.criteria),
        );
      }
      if (crit.rating < 1 || crit.rating > 5) {
        throw AppErrors.badRequest(
          AppErrorTemplates.criterionRatingRange(crit.criteria),
        );
      }
    }
  }

  // ============================================
  // ОТВЕТЫ НА ОТЗЫВЫ
  // ============================================

  /**
   * Ответить на отзыв (мастер)
   */
  async replyToReview(reviewId: string, masterId: string, content: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, masterId: true, clientId: true },
    });
    if (!review) throw AppErrors.notFound(AppErrorMessages.REVIEW_NOT_FOUND);
    if (review.masterId !== masterId) {
      throw AppErrors.forbidden(AppErrorMessages.REVIEW_CANNOT_REPLY);
    }

    // Проверка, существует ли уже ответ
    const existingReply = await this.prisma.reviewReply.findUnique({
      where: { reviewId },
    });
    const result = existingReply
      ? await this.prisma.reviewReply.update({
          where: { reviewId },
          data: { content },
        })
      : await this.prisma.reviewReply.create({
          data: {
            reviewId,
            masterId,
            content,
          },
        });

    await this.invalidateMasterCache(review.masterId);
    await this.invalidateClientWrittenReviewsCache(review.clientId);
    return result;
  }

  /**
   * Удалить ответ на отзыв
   */
  async deleteReply(reviewId: string, masterId: string) {
    const reply = await this.prisma.reviewReply.findUnique({
      where: { reviewId },
      include: { review: { select: { clientId: true } } },
    });
    if (!reply) throw AppErrors.notFound(AppErrorMessages.REPLY_NOT_FOUND);
    if (reply.masterId !== masterId) {
      throw AppErrors.forbidden(AppErrorMessages.ACCESS_DENIED);
    }

    await this.prisma.reviewReply.delete({ where: { reviewId } });
    await this.invalidateMasterCache(masterId);
    await this.invalidateClientWrittenReviewsCache(reply.review.clientId);
    return { deleted: true };
  }

  // ============================================
  // ГОЛОСА ЗА ОТЗЫВЫ
  // ============================================

  /**
   * Голосование "полезный отзыв"
   */
  async voteHelpful(reviewId: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw AppErrors.notFound(AppErrorMessages.REVIEW_NOT_FOUND);

    const existingVote = await this.prisma.reviewVote.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });
    if (existingVote) {
      throw AppErrors.badRequest(AppErrorMessages.REVIEW_ALREADY_VOTED);
    }

    const vote = await this.prisma.reviewVote.create({
      data: { reviewId, userId },
    });

    const votesCount = await this.prisma.reviewVote.count({
      where: { reviewId },
    });
    return { ...vote, votesCount };
  }

  /**
   * Убрать голос
   */
  async removeVote(reviewId: string, userId: string) {
    const vote = await this.prisma.reviewVote.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });
    if (!vote) throw AppErrors.notFound(AppErrorMessages.VOTE_NOT_FOUND);

    await this.prisma.reviewVote.delete({
      where: { reviewId_userId: { reviewId, userId } },
    });

    const votesCount = await this.prisma.reviewVote.count({
      where: { reviewId },
    });
    return { deleted: true, votesCount };
  }

  private async invalidateMasterCache(masterId: string) {
    await this.cache.invalidateMasterRelated(masterId);
  }

  private async invalidateClientWrittenReviewsCache(
    clientId: string | null | undefined,
  ) {
    if (!clientId) return;
    await this.cache.invalidate(
      this.cache.patterns.clientWrittenReviews(clientId),
    );
  }
}
