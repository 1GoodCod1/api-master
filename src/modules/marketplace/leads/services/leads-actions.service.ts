import { Injectable, Logger } from '@nestjs/common';
import {
  AppErrors,
  AppErrorMessages,
  AppErrorTemplates,
} from '../../../../common/errors';
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
import { NotificationsInAppFacade } from '../../../notifications/notifications/facades/notifications-in-app.facade';
import { UpdateLeadStatusDto } from '../dto/update-lead-status.dto';
import { MastersAvailabilityFacade } from '../../masters/facades/masters-availability.facade';
import { EmailDripService } from '../../../email/email-drip.service';
import { ReferralsService } from '../../../engagement/referrals/referrals.service';
import { fireAndForget } from '../../../../common/utils/fire-and-forget';

/**
 * Допустимые переходы статусов лида.
 * CLOSED и SPAM — финальные статусы. Возврат из них невозможен.
 */
/**
 * Допустимые переходы для МАСТЕРА.
 * IN_PROGRESS → PENDING_CLOSE (запрос подтверждения у клиента).
 * PENDING_CLOSE → CLOSED разрешён только клиенту (см. VALID_CLIENT_TRANSITIONS).
 */
const VALID_LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [
    LeadStatus.IN_PROGRESS,
    LeadStatus.PENDING_CLOSE,
    LeadStatus.SPAM,
  ],
  [LeadStatus.IN_PROGRESS]: [LeadStatus.PENDING_CLOSE, LeadStatus.SPAM],
  [LeadStatus.PENDING_CLOSE]: [LeadStatus.SPAM], // мастер может только спам
  [LeadStatus.CLOSED]: [], // финальный
  [LeadStatus.SPAM]: [], // финальный
};

/**
 * Допустимые переходы для КЛИЕНТА.
 * Клиент может подтвердить (CLOSED) или отклонить (IN_PROGRESS) закрытие.
 */
const VALID_CLIENT_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [],
  [LeadStatus.IN_PROGRESS]: [],
  [LeadStatus.PENDING_CLOSE]: [LeadStatus.CLOSED, LeadStatus.IN_PROGRESS],
  [LeadStatus.CLOSED]: [],
  [LeadStatus.SPAM]: [],
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
    private readonly inAppNotifications: NotificationsInAppFacade,
    private readonly mastersAvailability: MastersAvailabilityFacade,
    private readonly emailDripService: EmailDripService,
    private readonly referralsService: ReferralsService,
  ) {}

  /**
   * Обновление статуса лида с валидацией допустимых переходов.
   * Мастер: IN_PROGRESS → PENDING_CLOSE (запрос подтверждения).
   * Клиент: PENDING_CLOSE → CLOSED (подтвердил) или PENDING_CLOSE → IN_PROGRESS (отклонил).
   */
  async updateStatus(
    idOrEncoded: string,
    authUser: JwtUser,
    updateDto: UpdateLeadStatusDto,
  ) {
    const isClient = authUser.role === UserRole.CLIENT;
    const isAdmin = authUser.role === UserRole.ADMIN;
    const masterId = authUser.masterProfile?.id;

    if (!masterId && !isAdmin && !isClient) {
      throw AppErrors.badRequest(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    }

    const leadId = decodeId(idOrEncoded) ?? idOrEncoded;

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw AppErrors.notFound(AppErrorMessages.LEAD_NOT_FOUND);
    }

    // Проверка прав доступа
    if (isClient) {
      if (lead.clientId !== authUser.id) {
        throw AppErrors.forbidden(AppErrorMessages.LEAD_UPDATE_OWN_ONLY);
      }
    } else if (!isAdmin && lead.masterId !== masterId) {
      throw AppErrors.forbidden(AppErrorMessages.LEAD_UPDATE_OWN_ONLY);
    }

    const oldStatus = lead.status;
    const newStatus = updateDto.status;

    // Валидация допустимых переходов
    if (!isAdmin) {
      const transitions = isClient
        ? (VALID_CLIENT_TRANSITIONS[oldStatus] ?? [])
        : (VALID_LEAD_STATUS_TRANSITIONS[oldStatus] ?? []);

      if (!transitions.includes(newStatus)) {
        if (FINAL_LEAD_STATUSES.includes(oldStatus)) {
          throw AppErrors.badRequest(
            AppErrorTemplates.leadFinalState(oldStatus),
          );
        }
        throw AppErrors.badRequest(
          AppErrorTemplates.leadStatusTransition(
            oldStatus,
            newStatus,
            transitions,
          ),
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

    // При переходе в PENDING_CLOSE — уведомляем клиента о запросе подтверждения
    if (newStatus === LeadStatus.PENDING_CLOSE && lead.clientId) {
      const master = await this.prisma.master.findUnique({
        where: { id: lead.masterId },
        select: { user: { select: { firstName: true, lastName: true } } },
      });
      const masterName =
        formatUserName(master?.user?.firstName, master?.user?.lastName) ||
        'Мастер';

      fireAndForget(
        this.inAppNotifications.notify({
          userId: lead.clientId,
          category: NotificationCategory.LEAD_CLOSE_REQUESTED,
          title: 'Запрос на закрытие заявки',
          message: `${masterName} хочет закрыть вашу заявку. Подтвердите или отклоните.`,
          messageKey: 'notifications.messages.leadCloseRequested',
          messageParams: { masterName },
          metadata: { leadId: updated.id, status: updated.status },
        }),
        this.logger,
        'leadCloseRequested notification',
      );
    }

    // Обновление счётчика активных лидов при закрытии (Через централизованный сервис)
    if (oldStatus !== LeadStatus.CLOSED && newStatus === LeadStatus.CLOSED) {
      const updatedMaster = await this.mastersAvailability.decrementActiveLeads(
        lead.masterId,
      );

      // Если статус перешёл в AVAILABLE — отправляем уведомления
      if (updatedMaster?.availabilityStatus === 'AVAILABLE') {
        fireAndForget(
          this.notifySubscribersAboutAvailability(lead.masterId),
          this.logger,
          'notifySubscribersAboutAvailability',
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

        fireAndForget(
          this.referralsService.qualifyReferral(lead.clientId),
          this.logger,
          'qualifyReferral',
        );
        fireAndForget(
          this.emailDripService.startChain(lead.clientId, 'lead_closed', {
            masterName,
          }),
          this.logger,
          'lead_closed drip',
        );
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
          .catch((err: unknown) => {
            this.logger.error(
              `[side-effect] notifyMasterAvailable(${subscription.clientId}) failed`,
              err instanceof Error ? err.stack : undefined,
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
