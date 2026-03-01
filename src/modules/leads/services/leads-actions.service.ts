import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { InAppNotificationService } from '../../notifications/services/in-app-notification.service';
import { UpdateLeadStatusDto } from '../dto/update-lead-status.dto';
import { MastersAvailabilityService } from '../../masters/services/masters-availability.service';

/**
 * Допустимые переходы статусов лида.
 * CLOSED и SPAM — финальные статусы. Возврат из них невозможен.
 */
const VALID_LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['IN_PROGRESS', 'CLOSED', 'SPAM'],
  IN_PROGRESS: ['CLOSED', 'SPAM'],
  CLOSED: [], // финальный
  SPAM: [], // финальный
};

/**
 * Сервис для управления состоянием лидов (Action-часть)
 */
@Injectable()
export class LeadsActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly inAppNotifications: InAppNotificationService,
    private readonly availabilityService: MastersAvailabilityService,
  ) {}

  /**
   * Обновление статуса лида с валидацией допустимых переходов.
   */
  async updateStatus(
    leadId: string,
    authUser: JwtUser,
    updateDto: UpdateLeadStatusDto,
  ) {
    const masterId = authUser.masterProfile?.id;
    if (!masterId && authUser.role !== 'ADMIN') {
      throw new BadRequestException('Master profile not found');
    }

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (authUser.role !== 'ADMIN' && lead.masterId !== masterId) {
      throw new ForbiddenException('You can only update your own leads');
    }

    const oldStatus = lead.status;
    const newStatus = updateDto.status;

    // Валидация допустимых переходов (только для мастера, не для ADMIN)
    if (authUser.role !== 'ADMIN') {
      const allowedTransitions = VALID_LEAD_STATUS_TRANSITIONS[oldStatus] ?? [];
      if (!allowedTransitions.includes(newStatus)) {
        const finalStates: LeadStatus[] = ['CLOSED', 'SPAM'];
        if (finalStates.includes(oldStatus)) {
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
    if (oldStatus !== 'CLOSED' && newStatus === 'CLOSED') {
      const updatedMaster = await this.availabilityService.decrementActiveLeads(
        lead.masterId,
      );

      // Если статус перешёл в AVAILABLE — отправляем уведомления
      if (updatedMaster && updatedMaster.availabilityStatus === 'AVAILABLE') {
        void this.notifySubscribersAboutAvailability(lead.masterId);
      }
    }

    await this.cache.invalidate(`cache:master:${lead.masterId}:leads:*`);
    await this.cache.del(this.cache.keys.masterStats(lead.masterId));

    return updated;
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
      const masterName =
        master?.user &&
        [master.user.firstName, master.user.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

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
            console.error(
              `Failed to send master-available notification to client ${subscription.clientId}:`,
              err,
            );
          });

        await this.prisma.masterAvailabilitySubscription.update({
          where: { id: subscription.id },
          data: { notifiedAt: new Date() },
        });
      }
    } catch (error) {
      console.error('Error notifying subscribers:', error);
    }
  }
}
