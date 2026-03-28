import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { InAppNotificationService } from '../../../notifications/notifications/services/in-app-notification.service';
import { NotificationsService } from '../../../notifications/notifications/notifications.service';
import { CreateReviewDto } from '../dto/create-review.dto';
import type { ReviewCriteriaDto } from '../dto/review-criteria.dto';
import {
  LeadStatus,
  NotificationCategory,
  ReviewStatus,
} from '../../../../common/constants';
import { UserRole } from '@prisma/client';

@Injectable()
export class ReviewsActionService {
  private readonly logger = new Logger(ReviewsActionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly inAppNotifications: InAppNotificationService,
    private readonly notifications: NotificationsService,
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
      throw new BadRequestException(
        'Пользователь или телефон не найдены. Пожалуйста, заполните профиль.',
      );
    }

    if (authUser?.role === UserRole.CLIENT && !authUser.phoneVerified) {
      throw new ForbiddenException(
        'Для написания отзывов необходимо подтвердить номер телефона.',
      );
    }

    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      include: { user: { select: { phone: true } } },
    });
    if (!master) throw new NotFoundException('Мастер не найден');

    // Проверка на дубликат (один отзыв на мастера от клиента)
    const existingReview = await this.prisma.review.findFirst({
      where: { masterId, clientId },
    });
    if (existingReview) {
      throw new BadRequestException('Вы уже оставили отзыв об этом мастере');
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
      throw new BadRequestException('Указанная заявка не найдена.');
    }
    const phoneMatches =
      Boolean(user.phone?.trim() && lead.clientPhone?.trim()) &&
      user.phone.trim() === lead.clientPhone.trim();
    const isLeadOwner =
      lead.clientId === clientId || (lead.clientId == null && phoneMatches);
    if (!isLeadOwner) {
      throw new ForbiddenException('Эта заявка принадлежит другому клиенту.');
    }
    if (lead.masterId !== masterId) {
      throw new BadRequestException('Заявка относится к другому мастеру.');
    }
    if (lead.status !== LeadStatus.CLOSED) {
      throw new BadRequestException(
        'Отзыв можно оставить только после того, как заказ будет выполнен (статус CLOSED).',
      );
    }

    // Проверка: отзыв на этот лид уже написан
    const reviewForLead = await this.prisma.review.findUnique({
      where: { leadId },
    });
    if (reviewForLead) {
      throw new BadRequestException('Отзыв на эту заявку уже оставлен.');
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
      await this.notifications
        .sendSMS(master.user.phone, reviewMsg)
        .catch((e) => {
          this.logger.warn(
            `Failed to send review SMS: ${e instanceof Error ? e.message : e}`,
          );
        });
    }
    if (master.telegramChatId) {
      await this.notifications
        .sendTelegram(`⭐ ${reviewMsg}`, { chatId: master.telegramChatId })
        .catch((e) => {
          this.logger.warn(
            `Failed to send review Telegram: ${e instanceof Error ? e.message : e}`,
          );
        });
    }
    if (master.whatsappPhone) {
      await this.notifications
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
    if (!review) throw new NotFoundException('Отзыв не найден');

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
      this.inAppNotifications
        .notify({
          userId: master.userId,
          category: NotificationCategory.NEW_REVIEW,
          title: 'Статус отзыва обновлён',
          message: `Отзыв — ${statusMsg}`,
          messageKey: 'notifications.messages.reviewStatusUpdated',
          messageParams: { status: statusMsg },
          metadata: { reviewId: id, status },
        })
        .catch((err) =>
          this.logger.warn(
            `Failed to notify master of review status: ${String(err)}`,
          ),
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
        throw new BadRequestException(
          `Некорректный критерий: ${crit.criteria}`,
        );
      }
      if (crit.rating < 1 || crit.rating > 5) {
        throw new BadRequestException(
          `Рейтинг критерия ${crit.criteria} должен быть от 1 до 5`,
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
    if (!review) throw new NotFoundException('Отзыв не найден');
    if (review.masterId !== masterId) {
      throw new ForbiddenException('Вы не можете ответить на этот отзыв');
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
    if (!reply) throw new NotFoundException('Ответ не найден');
    if (reply.masterId !== masterId) {
      throw new ForbiddenException('Нет доступа');
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
    if (!review) throw new NotFoundException('Отзыв не найден');

    const existingVote = await this.prisma.reviewVote.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });
    if (existingVote) {
      throw new BadRequestException('Вы уже голосовали за этот отзыв');
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
    if (!vote) throw new NotFoundException('Голос не найден');

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
