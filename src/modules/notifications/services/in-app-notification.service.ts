import { Injectable, Logger } from '@nestjs/common';
import { NotificationStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { WebsocketService } from '../../websocket/websocket.service';
import { WebPushService } from '../../web-push/web-push.service';
import { NotificationCategory } from '@prisma/client';

/**
 * Параметры для создания in-app уведомления
 */
export interface CreateInAppNotificationParams {
  userId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  messageKey?: string;
  messageParams?: Record<string, string | number>;
  metadata?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Параметры для отправки уведомления админам
 */
export interface CreateAdminNotificationParams {
  category: NotificationCategory;
  title: string;
  message: string;
  messageKey?: string;
  messageParams?: Record<string, string | number>;
  metadata?: Record<string, any>;
}

/**
 * InAppNotificationService — единый сервис для создания и доставки in-app уведомлений.
 *
 * Отвечает за:
 * 1. Сохранение уведомления в БД (Notification table)
 * 2. Real-time доставку через WebSocket
 * 3. Маршрутизацию по ролям (master/admin/client)
 */
@Injectable()
export class InAppNotificationService {
  private readonly logger = new Logger(InAppNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketService: WebsocketService,
    private readonly webPushService: WebPushService,
  ) {}

  // ─── Универсальный метод ────────────────────────────────────────

  /**
   * Создать и отправить in-app уведомление конкретному пользователю
   */
  async notify(params: CreateInAppNotificationParams) {
    try {
      // 1. Сохраняем в БД
      const notification = await this.prisma.notification.create({
        data: {
          userId: params.userId,
          type: 'IN_APP',
          category: params.category,
          title: params.title,
          message: params.message,
          status: NotificationStatus.DELIVERED,
          sentAt: new Date(),
          metadata: params.metadata ?? undefined,
        },
      });

      // 2. Отправляем через WebSocket (messageKey + messageParams для i18n на фронте)
      await this.websocketService.sendToUser(params.userId, 'notification', {
        id: notification.id,
        type: this.categoryToEventType(params.category),
        category: params.category,
        title: params.title,
        message: params.message,
        messageKey: params.messageKey,
        messageParams: params.messageParams,
        data: params.metadata ?? {},
        timestamp: notification.createdAt.toISOString(),
        priority: params.priority ?? 'normal',
      });

      // 3. Отправляем Web Push (браузерные уведомления)
      const url = this.buildNotificationUrl(params.category, params.metadata);
      this.webPushService
        .sendToUser(params.userId, {
          title: params.title,
          body: params.message,
          url,
          tag: params.category,
          data: params.metadata ?? {},
        })
        .then((sent) => {
          if (sent > 0) {
            this.logger.debug(
              `Web push sent to user ${params.userId}: ${params.category}`,
            );
          }
        })
        .catch((err) => {
          this.logger.warn(
            `Web push failed for user ${params.userId}: ${String(err)}`,
          );
        });

      this.logger.debug(
        `In-app notification sent to user ${params.userId}: ${params.category}`,
      );

      return notification;
    } catch (error) {
      this.logger.error(
        `Failed to send in-app notification: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  // ─── ADMIN ──────────────────────────────────────────────────────

  /**
   * Отправить уведомление всем администраторам.
   * Сохраняет в БД для каждого админа и рассылает через WebSocket.
   */
  async notifyAdmins(params: CreateAdminNotificationParams) {
    try {
      // Найти всех админов
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN', isBanned: false },
        select: { id: true },
      });

      // Сохранить уведомление для каждого админа (batching)
      const notifications = await Promise.all(
        admins.map((admin) =>
          this.prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'IN_APP',
              category: params.category,
              title: params.title,
              message: params.message,
              status: NotificationStatus.DELIVERED,
              sentAt: new Date(),
              metadata: params.metadata ?? undefined,
            },
          }),
        ),
      );

      // Отправить через WebSocket (broadcast в admin room)
      this.websocketService.sendToAdmins('notification', {
        type: this.categoryToEventType(params.category),
        category: params.category,
        title: params.title,
        message: params.message,
        messageKey: params.messageKey,
        messageParams: params.messageParams,
        data: params.metadata ?? {},
        timestamp: new Date().toISOString(),
        priority: 'normal',
      });

      this.logger.debug(
        `Admin notification sent to ${admins.length} admins: ${params.category}`,
      );

      return notifications;
    } catch (error) {
      this.logger.error(
        `Failed to send admin notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ─── MASTER-SPECIFIC HELPERS ────────────────────────────────────

  /** Новая заявка (мастеру + админам) */
  async notifyNewLead(
    masterUserId: string,
    data: {
      leadId: string;
      clientName?: string;
      clientPhone?: string;
      masterId?: string;
    },
  ) {
    const clientName = data.clientName || 'клиента';
    await this.notify({
      userId: masterUserId,
      category: 'NEW_LEAD',
      title: 'Новая заявка',
      message: `Новая заявка от ${clientName}`,
      messageKey: 'notifications.messages.newLeadFrom',
      messageParams: { clientName },
      metadata: data,
      priority: 'high',
    });

    await this.notifyAdmins({
      category: 'ADMIN_NEW_LEAD',
      title: 'Новая заявка',
      message: `Заявка от ${clientName} для мастера`,
      messageKey: 'notifications.messages.newLeadFrom',
      messageParams: { clientName },
      metadata: data,
    });
  }

  /** Статус заявки обновлён (мастеру) */
  async notifyLeadStatusUpdated(
    masterUserId: string,
    data: { leadId: string; status: string; clientName?: string },
  ) {
    const clientName = data.clientName || 'клиента';
    await this.notify({
      userId: masterUserId,
      category: 'LEAD_STATUS_UPDATED',
      title: 'Статус заявки обновлён',
      message: `Заявка от ${clientName} — ${data.status}`,
      messageKey: 'notifications.messages.leadStatusFrom',
      messageParams: { clientName, status: data.status },
      metadata: data,
    });
  }

  /** Новый отзыв (мастеру + админам) */
  async notifyNewReview(
    masterUserId: string,
    data: {
      reviewId: string;
      rating: number;
      authorName?: string;
      masterId?: string;
    },
  ) {
    const authorName = data.authorName || 'Пользователь';
    await this.notify({
      userId: masterUserId,
      category: 'NEW_REVIEW',
      title: 'Новый отзыв',
      message: `${authorName} оставил отзыв с оценкой ${data.rating}/5`,
      metadata: data,
      priority: 'normal',
    });

    await this.notifyAdmins({
      category: 'ADMIN_NEW_REVIEW',
      title: 'Новый отзыв',
      message: `Отзыв от ${authorName} — ${data.rating}/5`,
      metadata: data,
    });
  }

  /** Новое сообщение в чате */
  async notifyNewChatMessage(
    recipientUserId: string,
    data: {
      conversationId: string;
      messageId: string;
      senderType: string;
      senderName?: string;
    },
  ) {
    const senderLabel = data.senderType === 'MASTER' ? 'мастера' : 'клиента';
    await this.notify({
      userId: recipientUserId,
      category: 'NEW_CHAT_MESSAGE',
      title: 'Новое сообщение',
      message: `Новое сообщение от ${data.senderName || senderLabel}`,
      metadata: data,
    });
  }

  /** Подписка истекает через N дней */
  async notifySubscriptionExpiring(
    masterUserId: string,
    data: {
      daysLeft: number;
      tariffType: string;
      expiresAt: Date | string;
      masterId: string;
    },
  ) {
    const days = data.daysLeft;
    const suffix = days === 1 ? 'день' : 'дня';
    await this.notify({
      userId: masterUserId,
      category: 'SUBSCRIPTION_EXPIRING',
      title: 'Подписка истекает',
      message: `Ваш тариф ${data.tariffType} истекает через ${days} ${suffix}`,
      metadata: {
        ...data,
        expiresAt:
          data.expiresAt instanceof Date
            ? data.expiresAt.toISOString()
            : data.expiresAt,
      },
      priority: 'high',
    });
  }

  /** Подписка истекла */
  async notifySubscriptionExpired(
    masterUserId: string,
    data: { tariffType: string; masterId: string },
  ) {
    await this.notify({
      userId: masterUserId,
      category: 'SUBSCRIPTION_EXPIRED',
      title: 'Подписка истекла',
      message: `Ваш тариф ${data.tariffType} истёк. Текущий тариф: BASIC`,
      metadata: data,
      priority: 'high',
    });
  }

  /** Oплата успешна */
  async notifyPaymentSuccess(
    userId: string,
    data: { paymentId: string; tariffType: string; amount: string | number },
  ) {
    await this.notify({
      userId,
      category: 'PAYMENT_SUCCESS',
      title: 'Оплата успешна',
      message: `Оплата тарифа ${data.tariffType} прошла успешно`,
      metadata: data,
    });

    await this.notifyAdmins({
      category: 'ADMIN_NEW_PAYMENT',
      title: 'Новый платёж',
      message: `Оплата тарифа ${data.tariffType}: ${data.amount}`,
      metadata: data,
    });
  }

  /** Оплата не прошла */
  async notifyPaymentFailed(
    userId: string,
    data: { paymentId: string; tariffType: string; reason?: string },
  ) {
    await this.notify({
      userId,
      category: 'PAYMENT_FAILED',
      title: 'Ошибка оплаты',
      message: `Оплата тарифа ${data.tariffType} не прошла`,
      metadata: data,
    });
  }

  // ─── ADMIN-SPECIFIC HELPERS ─────────────────────────────────────

  /** Новый запрос на верификацию */
  async notifyNewVerificationRequest(data: {
    masterId: string;
    masterName?: string;
    verificationId: string;
  }) {
    await this.notifyAdmins({
      category: 'ADMIN_NEW_VERIFICATION',
      title: 'Запрос на верификацию',
      message: `Мастер ${data.masterName || data.masterId.slice(0, 8)} подал заявку на верификацию`,
      metadata: data,
    });
  }

  /** Верификация одобрена (мастеру) */
  async notifyVerificationApproved(
    masterUserId: string,
    data: { masterId: string; verificationId?: string; isFirst100?: boolean },
  ) {
    await this.notify({
      userId: masterUserId,
      category: 'VERIFICATION_APPROVED',
      title: 'Верификация одобрена',
      message: 'Ваш профиль успешно верифицирован! ✅',
      metadata: data,
      priority: 'high',
    });
  }

  /** Верификация отклонена (мастеру) */
  async notifyVerificationRejected(
    masterUserId: string,
    data: { masterId: string; reason?: string; verificationId?: string },
  ) {
    await this.notify({
      userId: masterUserId,
      category: 'VERIFICATION_REJECTED',
      title: 'Верификация отклонена',
      message: data.reason
        ? `Верификация отклонена: ${data.reason}`
        : 'Верификация отклонена. Проверьте документы и отправьте повторно.',
      metadata: data,
      priority: 'high',
    });
  }

  /** Новый отчёт/жалоба */
  async notifyNewReport(data: {
    reportId: string;
    reason: string;
    clientId: string;
    masterId: string;
  }) {
    await this.notifyAdmins({
      category: 'ADMIN_NEW_REPORT',
      title: 'Новая жалоба',
      message: `Жалоба: ${data.reason}`,
      metadata: data,
    });
  }

  /** Новый пользователь/мастер зарегистрировался */
  async notifyNewRegistration(data: {
    userId: string;
    role: string;
    name?: string;
  }) {
    const category =
      data.role === 'MASTER' ? 'ADMIN_NEW_MASTER' : 'ADMIN_NEW_USER';
    const label = data.role === 'MASTER' ? 'мастер' : 'пользователь';
    await this.notifyAdmins({
      category: category as NotificationCategory,
      title: `Новый ${label}`,
      message: `Зарегистрирован ${label}: ${data.name || data.userId.slice(0, 8)}`,
      metadata: data,
    });
  }

  /** Системный алерт */
  async notifySystemAlert(data: {
    alertType: string;
    message: string;
    details?: any;
  }) {
    await this.notifyAdmins({
      category: 'ADMIN_SYSTEM_ALERT',
      title: 'Системное уведомление',
      message: data.message,
      metadata: data,
    });
  }

  // ─── CLIENT HELPERS ─────────────────────────────────────────────

  /** Заявка отправлена мастеру (клиенту) */
  async notifyLeadSentToClient(
    clientUserId: string,
    data: { leadId: string; masterName: string },
  ) {
    await this.notify({
      userId: clientUserId,
      category: 'LEAD_SENT',
      title: 'Заявка отправлена',
      message: `Заявка отправлена мастеру ${data.masterName}`,
      metadata: data,
    });
  }

  /** Мастер снова доступен (клиенту, подписавшемуся на уведомление) */
  async notifyMasterAvailable(
    clientUserId: string,
    data: { masterId: string; masterName?: string },
  ) {
    const name = data.masterName || 'Мастер';
    await this.notify({
      userId: clientUserId,
      category: 'MASTER_AVAILABLE',
      title: 'Мастер доступен',
      message: `${name} снова принимает заявки. Можете отправить заявку.`,
      metadata: data,
      priority: 'high',
    });
  }

  /** Новая акция у мастера */
  async notifyNewPromotion(
    clientUserId: string,
    data: {
      masterId: string;
      masterName: string;
      promotionId: string;
      discount: number;
    },
  ) {
    await this.notify({
      userId: clientUserId,
      category: 'NEW_PROMOTION',
      title: 'Новая акция! 🔥',
      message: `Мастер ${data.masterName} запустил акцию: -${data.discount}%! Успейте записаться.`,
      metadata: data,
      priority: 'high',
    });
  }

  // ─── BOOKING HELPERS ──────────────────────────────────────────

  /** Бронирование подтверждено (мастеру + клиенту) */
  async notifyBookingConfirmed(
    masterUserId: string,
    clientUserId: string | null,
    data: {
      bookingId: string;
      masterId: string;
      masterName?: string;
      clientName?: string;
      startTime: string;
    },
  ) {
    const clientLabel = data.clientName || 'Клиент';
    const masterLabel = data.masterName || 'Мастер';

    // Уведомление мастеру
    await this.notify({
      userId: masterUserId,
      category: 'BOOKING_CONFIRMED',
      title: 'Новая запись',
      message: `${clientLabel} записался на ${data.startTime}`,
      metadata: data,
      priority: 'high',
    });

    // Уведомление клиенту
    if (clientUserId) {
      await this.notify({
        userId: clientUserId,
        category: 'BOOKING_CONFIRMED',
        title: 'Запись подтверждена',
        message: `Вы записаны к ${masterLabel} на ${data.startTime}`,
        metadata: data,
      });
    }
  }

  /** Бронирование отменено (мастеру + клиенту) */
  async notifyBookingCancelled(
    masterUserId: string,
    clientUserId: string | null,
    data: {
      bookingId: string;
      masterId: string;
      masterName?: string;
      clientName?: string;
      startTime: string;
    },
  ) {
    const clientLabel = data.clientName || 'Клиент';
    const masterLabel = data.masterName || 'Мастер';

    // Уведомление мастеру
    await this.notify({
      userId: masterUserId,
      category: 'BOOKING_CANCELLED',
      title: 'Запись отменена',
      message: `Запись с ${clientLabel} на ${data.startTime} отменена`,
      metadata: data,
    });

    // Уведомление клиенту
    if (clientUserId) {
      await this.notify({
        userId: clientUserId,
        category: 'BOOKING_CANCELLED',
        title: 'Запись отменена',
        message: `Запись к ${masterLabel} на ${data.startTime} отменена`,
        metadata: data,
      });
    }
  }

  // ─── UTILS ──────────────────────────────────────────────────────

  /**
   * Построить URL для Web Push (относительный путь для клика по уведомлению)
   */
  private buildNotificationUrl(
    category: NotificationCategory,
    metadata?: Record<string, any>,
  ): string | undefined {
    const m = metadata ?? {};
    const leadId = m.leadId as string | undefined;
    const conversationId = m.conversationId as string | undefined;
    const masterId = m.masterId as string | undefined;

    const masterPaths: Partial<Record<NotificationCategory, string>> = {
      NEW_LEAD: leadId ? `/dashboard/leads/${leadId}` : '/dashboard/leads',
      LEAD_STATUS_UPDATED: leadId
        ? `/dashboard/leads/${leadId}`
        : '/dashboard/leads',
      NEW_REVIEW: '/dashboard/reviews',
      NEW_CHAT_MESSAGE: conversationId
        ? `/dashboard/chat/${conversationId}`
        : '/dashboard/chat',
      SUBSCRIPTION_EXPIRING: '/dashboard/subscription',
      SUBSCRIPTION_EXPIRED: '/dashboard/subscription',
      PAYMENT_SUCCESS: '/dashboard/payments',
      PAYMENT_FAILED: '/dashboard/payments',
      VERIFICATION_APPROVED: '/dashboard/profile',
      VERIFICATION_REJECTED: '/dashboard/verification',
      BOOKING_CONFIRMED: '/dashboard/bookings',
      BOOKING_CANCELLED: '/dashboard/bookings',
    };

    const clientPaths: Partial<Record<NotificationCategory, string>> = {
      LEAD_SENT: leadId
        ? `/client-dashboard/leads/${leadId}/book`
        : '/client-dashboard/leads',
      MASTER_AVAILABLE: masterId ? `/masters/${masterId}` : '/masters',
      NEW_PROMOTION: masterId ? `/masters/${masterId}` : '/masters',
      NEW_CHAT_MESSAGE: conversationId
        ? `/client-dashboard/chat/${conversationId}`
        : '/client-dashboard/chat',
      BOOKING_CONFIRMED: '/client-dashboard/bookings',
      BOOKING_CANCELLED: '/client-dashboard/bookings',
    };

    return masterPaths[category] ?? clientPaths[category] ?? '/';
  }

  /**
   * Конвертировать NotificationCategory -> фронтенд event type
   * для обратной совместимости с текущим фронтендом
   */
  private categoryToEventType(category: NotificationCategory): string {
    const map: Record<string, string> = {
      NEW_LEAD: 'new_lead',
      LEAD_STATUS_UPDATED: 'lead_status_updated',
      NEW_REVIEW: 'new_review',
      NEW_CHAT_MESSAGE: 'new_chat_message',
      LEAD_SENT: 'lead_sent',
      SUBSCRIPTION_EXPIRING: 'subscription_expiring',
      SUBSCRIPTION_EXPIRED: 'subscription_expired',
      PAYMENT_SUCCESS: 'payment_success',
      PAYMENT_FAILED: 'payment_failed',
      VERIFICATION_APPROVED: 'verification_approved',
      VERIFICATION_REJECTED: 'verification_rejected',
      ADMIN_NEW_VERIFICATION: 'admin_new_verification',
      ADMIN_NEW_REPORT: 'admin_new_report',
      ADMIN_NEW_USER: 'admin_new_user',
      ADMIN_NEW_MASTER: 'admin_new_master',
      ADMIN_SYSTEM_ALERT: 'admin_system_alert',
      ADMIN_NEW_LEAD: 'admin_new_lead',
      ADMIN_NEW_REVIEW: 'admin_new_review',
      ADMIN_NEW_PAYMENT: 'admin_new_payment',
      MASTER_RESPONDED: 'master_responded',
      MASTER_AVAILABLE: 'master_available',
      BOOKING_CONFIRMED: 'booking_confirmed',
      BOOKING_CANCELLED: 'booking_cancelled',
      BOOKING_REMINDER: 'booking_reminder',
      NEW_PROMOTION: 'new_promotion',
      PROMOTION_STARTED: 'promotion_started',
      SYSTEM_MAINTENANCE: 'system_maintenance',
      SYSTEM_UPDATE: 'system_update',
    };
    return map[category] ?? category.toLowerCase();
  }
}
