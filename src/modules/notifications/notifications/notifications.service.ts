import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationsQueryService } from './services/notifications-query.service';
import {
  NotificationsActionService,
  SaveNotificationParams,
} from './services/notifications-action.service';
import {
  NotificationsSenderService,
  type LeadNotificationData,
  type PaymentConfirmationData,
} from './services/notifications-sender.service';
import {
  SMSJobData,
  TelegramJobData,
} from '../../shared/types/notification.types';
import type { NotificationCategory, NotificationType } from '@prisma/client';

/**
 * NotificationsService — координатор модуля уведомлений.
 * Управляет процессами получения данных, изменения статусов и отправки через специализированные сервисы.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly queryService: NotificationsQueryService,
    private readonly actionService: NotificationsActionService,
    private readonly senderService: NotificationsSenderService,
  ) {}

  /**
   * Получить уведомления пользователя
   */
  async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      cursor?: string;
      unreadOnly?: boolean;
      category?: NotificationCategory;
      type?: NotificationType;
    },
  ) {
    return this.queryService.getUserNotifications(userId, options);
  }

  /**
   * Получить количество непрочитанных уведомлений
   */
  async getUnreadCount(userId: string) {
    return this.queryService.getUnreadCount(userId);
  }

  /**
   * Отметить уведомление как прочитанное
   */
  async markAsRead(userId: string, notificationId: string) {
    return this.actionService.markAsRead(userId, notificationId);
  }

  /**
   * Отметить все уведомления пользователя как прочитанные
   */
  async markAllAsRead(userId: string) {
    return this.actionService.markAllAsRead(userId);
  }

  /**
   * Удалить конкретное уведомление
   */
  async deleteNotification(userId: string, notificationId: string) {
    return this.actionService.deleteNotification(userId, notificationId);
  }

  /**
   * Удалить все уведомления пользователя
   */
  async deleteAllNotifications(userId: string) {
    return this.actionService.deleteAllNotifications(userId);
  }

  /**
   * Отправить SMS уведомление
   */
  async sendSMS(
    to: string,
    message: string,
    options?: Record<string, unknown>,
  ) {
    return this.senderService.sendSMS(to, message, options);
  }

  /**
   * Отправить Telegram уведомление
   */
  async sendTelegram(
    message: string,
    options?: { chatId?: string; silent?: boolean },
  ) {
    return this.senderService.sendTelegram(message, options);
  }

  /**
   * Отправить WhatsApp уведомление
   */
  async sendWhatsApp(to: string, message: string) {
    return this.senderService.sendWhatsApp(to, message);
  }

  /**
   * Уведомление о новом лиде (SMS на to, Telegram и WhatsApp — по привязанным каналам premium)
   */
  async sendLeadNotification(
    to: string,
    leadData: LeadNotificationData,
    options?: { telegramChatId?: string; whatsappPhone?: string },
  ) {
    return this.senderService.sendLeadNotification(to, leadData, options);
  }

  /**
   * Подтверждение платежа (SMS + опционально Telegram/WhatsApp)
   */
  async sendPaymentConfirmation(
    to: string,
    paymentData: PaymentConfirmationData,
    options?: { telegramChatId?: string; whatsappPhone?: string },
  ) {
    return this.senderService.sendPaymentConfirmation(to, paymentData, options);
  }

  /**
   * Обработка задачи SMS из очереди (Bull)
   */
  async processSMSJob(job: Job<SMSJobData>) {
    return this.senderService.processSMSJob(job);
  }

  /**
   * Обработка задачи Telegram из очереди (Bull)
   */
  async processTelegramJob(job: Job<TelegramJobData>) {
    return this.senderService.processTelegramJob(job);
  }

  /**
   * Сохранить уведомление в БД (внутренний метод)
   */
  async saveNotification(params: SaveNotificationParams) {
    return this.actionService.saveNotification(params);
  }
}
