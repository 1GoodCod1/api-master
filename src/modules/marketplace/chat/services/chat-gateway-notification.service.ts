import { Injectable, Logger } from '@nestjs/common';
import { SenderType } from '@prisma/client';
import type { OutgoingChatMessage } from '../chat.types';
import { NotificationsInAppFacade } from '../../../notifications/notifications/facades/notifications-in-app.facade';
import { NotificationsOutboundFacade } from '../../../notifications/notifications/facades/notifications-outbound.facade';

@Injectable()
export class ChatGatewayNotificationService {
  private readonly logger = new Logger(ChatGatewayNotificationService.name);

  constructor(
    private readonly inAppNotifications: NotificationsInAppFacade,
    private readonly notifications: NotificationsOutboundFacade,
  ) {}

  /**
   * Уведомить офлайн-пользователя: in-app + опционально SMS, когда мастер ответил в чате.
   */
  async notifyOfflineUser(
    message: OutgoingChatMessage,
    conversationId: string,
  ): Promise<void> {
    try {
      const conversation = message.conversation;
      if (!conversation) return;

      const recipientUserId =
        message.senderType === SenderType.MASTER
          ? conversation.clientId
          : (conversation.masterUserId ?? null);

      if (!recipientUserId) return;

      const senderName =
        message.senderType === SenderType.MASTER
          ? (conversation.masterName ?? undefined)
          : (conversation.clientName ?? undefined);

      await this.inAppNotifications
        .notifyNewChatMessage(recipientUserId, {
          conversationId,
          messageId: message.id,
          senderType: message.senderType,
          senderName: senderName || undefined,
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`Failed to save in-app chat notification: ${msg}`);
        });

      if (
        message.senderType === SenderType.MASTER &&
        conversation.clientId === recipientUserId &&
        conversation.clientPhone
      ) {
        const masterName = conversation.masterName || 'Мастер';
        const smsText = `${masterName} ответил вам в чате. Откройте приложение для просмотра.`;
        await this.notifications
          .sendSMS(conversation.clientPhone, smsText)
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(`Failed to send MASTER_RESPONDED SMS: ${msg}`);
          });
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error notifying offline user: ${errMessage}`);
    }
  }
}
