import { Injectable } from '@nestjs/common';
import type { LeadNotificationData, SaveNotificationParams } from '../../types';
import { NotificationsService } from '../notifications.service';

/**
 * Публичный контракт для SMS, Telegram, WhatsApp и сохранения записей уведомлений.
 */
@Injectable()
export class NotificationsOutboundFacade {
  constructor(private readonly notifications: NotificationsService) {}

  sendSMS(to: string, message: string, options?: Record<string, unknown>) {
    return this.notifications.sendSMS(to, message, options);
  }

  sendTelegram(
    message: string,
    options?: { chatId?: string; silent?: boolean },
  ) {
    return this.notifications.sendTelegram(message, options);
  }

  sendWhatsApp(to: string, message: string) {
    return this.notifications.sendWhatsApp(to, message);
  }

  sendLeadNotification(
    to: string,
    leadData: LeadNotificationData,
    options?: { telegramChatId?: string; whatsappPhone?: string },
  ) {
    return this.notifications.sendLeadNotification(to, leadData, options);
  }

  saveNotification(params: SaveNotificationParams) {
    return this.notifications.saveNotification(params);
  }
}
