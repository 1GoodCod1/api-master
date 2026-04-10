import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { InAppNotificationService } from '../../../notifications/notifications/services/in-app-notification.service';
import { NotificationCategory, SenderType } from '@prisma/client';
import { LeadStatus } from '../../../../common/constants';
import { fireAndForget } from '../../../../common/utils/fire-and-forget';

@Injectable()
export class ChatLeadTransitionService {
  private readonly logger = new Logger(ChatLeadTransitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly inAppNotifications: InAppNotificationService,
  ) {}

  /**
   * Проверка возможности перевода лида NEW -> IN_PROGRESS при обмене сообщениями.
   */
  async checkAndTransition(conversationId: string): Promise<void> {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          id: true,
          leadId: true,
          masterId: true,
          lead: {
            select: {
              status: true,
              clientName: true,
              clientId: true,
            },
          },
        },
      });

      if (
        !conversation?.leadId ||
        conversation.lead?.status !== LeadStatus.NEW
      ) {
        return;
      }

      const [msgMaster, msgClient] = await Promise.all([
        this.prisma.message.findFirst({
          where: {
            conversationId,
            senderType: SenderType.MASTER,
            isAutoresponder: false,
          },
          select: { id: true },
        }),
        this.prisma.message.findFirst({
          where: { conversationId, senderType: SenderType.CLIENT },
          select: { id: true },
        }),
      ]);

      if (!msgMaster || !msgClient) {
        return;
      }

      await this.prisma.lead.update({
        where: { id: conversation.leadId },
        data: {
          status: LeadStatus.IN_PROGRESS,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Lead ${conversation.leadId} auto-transitioned to ${LeadStatus.IN_PROGRESS} due to chat message exchange`,
      );

      await this.cache.invalidateMasterData(conversation.masterId);

      const master = await this.prisma.master.findUnique({
        where: { id: conversation.masterId },
        select: { userId: true },
      });
      const clientName = conversation.lead?.clientName ?? undefined;
      const clientId = conversation.lead?.clientId ?? null;

      if (master) {
        fireAndForget(
          this.inAppNotifications.notifyLeadStatusUpdated(master.userId, {
            leadId: conversation.leadId,
            status: LeadStatus.IN_PROGRESS,
            clientName,
          }),
          this.logger,
          'notifyLeadStatusUpdated (master)',
        );
      }
      if (clientId) {
        fireAndForget(
          this.inAppNotifications.notify({
            userId: clientId,
            category: NotificationCategory.LEAD_STATUS_UPDATED,
            title: 'Статус заявки обновлён',
            message: `Ваша заявка — ${LeadStatus.IN_PROGRESS}`,
            messageKey: 'notifications.messages.leadStatusUpdated',
            messageParams: { status: LeadStatus.IN_PROGRESS },
            metadata: {
              leadId: conversation.leadId,
              status: LeadStatus.IN_PROGRESS,
            },
          }),
          this.logger,
          'notifyLeadStatusUpdated (client)',
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to check lead transition for conversation ${conversationId}:`,
        error,
      );
    }
  }
}
