import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  FINAL_LEAD_STATUSES,
  LeadStatus,
  NotificationCategory,
  UserRole,
} from '../../../../common/constants';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../../shared/database/prisma.service';
import { decodeId } from '../../../shared/utils/id-encoder';
import { CacheService } from '../../../shared/cache/cache.service';
import { formatUserName } from '../../../shared/utils/format-name.util';
import { InAppNotificationService } from '../../../notifications/notifications/services/in-app-notification.service';
import { UpdateLeadStatusDto } from '../dto/update-lead-status.dto';
import { MastersAvailabilityService } from '../../masters/services/masters-availability.service';
import { EmailDripService } from '../../../email/email-drip.service';
import { ReferralsService } from '../../../engagement/referrals/referrals.service';

/**
 * Допустимые переходы статусов лида.
 * CLOSED и SPAM — финальные статусы. Возврат из них невозможен.
 */
const VALID_LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [
    LeadStatus.IN_PROGRESS,
    LeadStatus.CLOSED,
    LeadStatus.SPAM,
  ],
  [LeadStatus.IN_PROGRESS]: [LeadStatus.CLOSED, LeadStatus.SPAM],
  [LeadStatus.CLOSED]: [], // финальный
  [LeadStatus.SPAM]: [], // финальный
};

/**
 * Сервис для управления состоянием лидов (Action-часть)
 */
@Injectable()
export class LeadsActionsService {
  private readonly logger = new Logger(LeadsActionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly inAppNotifications: InAppNotificationService,
    private readonly availabilityService: MastersAvailabilityService,
    private readonly emailDripService: EmailDripService,
    private readonly referralsService: ReferralsService,
  ) {}

  /**
   * Обновление статуса лида с валидацией допустимых переходов.
   */
  async updateStatus(
    idOrEncoded: string,
    authUser: JwtUser,
    updateDto: UpdateLeadStatusDto,
  ) {
    const masterId = authUser.masterProfile?.id;
    if (!masterId && authUser.role !== UserRole.ADMIN) {
      throw new BadRequestException('Master profile not found');
    }

    const leadId = decodeId(idOrEncoded) ?? idOrEncoded;

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (authUser.role !== UserRole.ADMIN && lead.masterId !== masterId) {
      throw new ForbiddenException('You can only update your own leads');
    }

    const oldStatus = lead.status;
    const newStatus = updateDto.status;

    // Валидация допустимых переходов (только для мастера, не для ADMIN)
    if (authUser.role !== UserRole.ADMIN) {
      const allowedTransitions = VALID_LEAD_STATUS_TRANSITIONS[oldStatus] ?? [];
      if (!allowedTransitions.includes(newStatus)) {
        if (FINAL_LEAD_STATUSES.includes(oldStatus)) {
          throw new BadRequestException(
            `Lead is already in a final state (${oldStatus}) and cannot be changed.`,
          );
        }
        throw new BadRequestException(
          `Invalid status transition from ${oldStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`,
        );
      }
    }

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    // Обновление счётчика активных лидов при закрытии (Через централизованный сервис)
    if (oldStatus !== LeadStatus.CLOSED && newStatus === LeadStatus.CLOSED) {
      const updatedMaster = await this.availabilityService.decrementActiveLeads(
        lead.masterId,
      );

      // Если статус перешёл в AVAILABLE — отправляем уведомления
      if (updatedMaster?.availabilityStatus === 'AVAILABLE') {
        void this.notifySubscribersAboutAvailability(lead.masterId).catch((e) =>
          this.logger.error('notifySubscribersAboutAvailability failed', e),
        );
      }

      // Если лид закрыт, проставляем квалификацию реферала и запускам рассылку (отзыв)
      if (lead.clientId) {
        const master = await this.prisma.master.findUnique({
          where: { id: lead.masterId },
          select: { user: { select: { firstName: true, lastName: true } } },
        });
        const masterName =
          formatUserName(master?.user?.firstName, master?.user?.lastName) ||
          undefined;

        this.referralsService
          .qualifyReferral(lead.clientId)
          .catch((e) => this.logger.error('qualifyReferral failed', e));
        this.emailDripService
          .startChain(lead.clientId, 'lead_closed', { masterName })
          .catch((e) => this.logger.error('lead_closed drip failed', e));
      }
    }

    await this.cache.invalidateMasterData(lead.masterId);

    await this.sendStatusUpdateNotifications(updated);

    return updated;
  }

  private async sendStatusUpdateNotifications(updated: {
    id: string;
    masterId: string;
    clientId: string | null;
    clientName: string | null;
    status: string;
  }) {
    try {
      const [master] = await Promise.all([
        this.prisma.master.findUnique({
          where: { id: updated.masterId },
          select: { userId: true },
        }),
        updated.clientId
          ? this.inAppNotifications.notify({
              userId: updated.clientId,
              category: NotificationCategory.LEAD_STATUS_UPDATED,
              title: 'Статус заявки обновлён',
              message: `Ваша заявка — ${updated.status}`,
              messageKey: 'notifications.messages.leadStatusUpdated',
              messageParams: { status: updated.status },
              metadata: { leadId: updated.id, status: updated.status },
            })
          : Promise.resolve(),
      ]);
      if (master) {
        await this.inAppNotifications.notifyLeadStatusUpdated(master.userId, {
          leadId: updated.id,
          status: updated.status,
          clientName: updated.clientName ?? undefined,
        });
      }
    } catch (err) {
      this.logger.error('Failed to send lead status notification', err);
    }
  }

  /**
   * Уведомление подписчиков о доступности мастера (in-app + WebSocket в кабинет клиента).
   * Вызывается при смене статуса мастера на AVAILABLE и при освобождении слота (закрытие лида).
   */
  async notifySubscribersAboutAvailability(masterId: string) {
    try {
      const master = await this.prisma.master.findUnique({
        where: { id: masterId },
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      });
      const masterName = formatUserName(
        master?.user?.firstName,
        master?.user?.lastName,
      );

      const subscriptions =
        await this.prisma.masterAvailabilitySubscription.findMany({
          where: {
            masterId,
            notifiedAt: null,
          },
        });

      if (subscriptions.length === 0) return;

      for (const subscription of subscriptions) {
        await this.inAppNotifications
          .notifyMasterAvailable(subscription.clientId, {
            masterId,
            masterName: masterName || undefined,
          })
          .catch((err) => {
            this.logger.error(
              `Failed to send master-available notification to client ${subscription.clientId}`,
              err,
            );
          });

        await this.prisma.masterAvailabilitySubscription.update({
          where: { id: subscription.id },
          data: { notifiedAt: new Date() },
        });
      }
    } catch (error) {
      this.logger.error('Subscriber notification failed', error);
    }
  }
}
