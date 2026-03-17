import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../../../notifications/notifications/notifications.service';
import { InAppNotificationService } from '../../../notifications/notifications/services/in-app-notification.service';
import { EmailDripService } from '../../../email/email-drip.service';
import { formatUserName } from '../../../shared/utils/format-name.util';

@Injectable()
export class LeadsCreateNotificationService {
  private readonly logger = new Logger(LeadsCreateNotificationService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly inAppNotifications: InAppNotificationService,
    private readonly emailDripService: EmailDripService,
  ) {}

  /**
   * Отправка всех уведомлений при создании лида.
   */
  async sendLeadNotifications(params: {
    lead: { id: string; masterId: string; clientId: string | null };
    master: {
      userId: string;
      user: {
        phone: string;
        firstName?: string | null;
        lastName?: string | null;
      };
      leadNotifyChannel?: string | null;
      telegramChatId?: string | null;
      whatsappPhone?: string | null;
    };
    clientId: string | null;
    resolvedClientName: string | null;
    resolvedClientPhone: string;
    message: string;
  }) {
    const {
      lead,
      master,
      clientId,
      resolvedClientName,
      resolvedClientPhone,
      message,
    } = params;

    const notificationOptions = this.buildNotificationOptions(master);
    await this.notificationsService.sendLeadNotification(
      master.user.phone,
      {
        leadId: lead.id,
        clientName: resolvedClientName || undefined,
        clientPhone: resolvedClientPhone,
        message,
        isPremium: false,
      },
      notificationOptions,
    );

    if (clientId) {
      const masterName = formatUserName(
        master.user.firstName,
        master.user.lastName,
        'мастеру',
      );
      try {
        await this.inAppNotifications
          .notifyLeadSentToClient(clientId, { leadId: lead.id, masterName })
          .catch(() => {});
      } catch (err) {
        this.logger.error(
          'Failed to send lead-sent notification to client',
          err,
        );
      }
      this.emailDripService
        .startChain(clientId, 'lead_created')
        .catch((err) => {
          this.logger.error('Ошибка запуска drip-цепочки lead_created', err);
        });
    }

    try {
      await this.inAppNotifications.notifyNewLead(master.userId, {
        leadId: lead.id,
        clientName: resolvedClientName || undefined,
        clientPhone: resolvedClientPhone,
        masterId: lead.masterId,
      });
    } catch (err) {
      this.logger.error('Ошибка сохранения in-app уведомления для лида', err);
    }
  }

  private buildNotificationOptions(master: {
    leadNotifyChannel?: string | null;
    telegramChatId?: string | null;
    whatsappPhone?: string | null;
  }) {
    const channel = master.leadNotifyChannel || 'both';
    const tg = master.telegramChatId;
    const wa = master.whatsappPhone;

    const options: { telegramChatId?: string; whatsappPhone?: string } = {};
    if (channel === 'telegram' && tg) options.telegramChatId = tg;
    else if (channel === 'whatsapp' && wa) options.whatsappPhone = wa;
    else if (channel === 'both') {
      if (tg) options.telegramChatId = tg;
      if (wa) options.whatsappPhone = wa;
    }
    return options;
  }
}
