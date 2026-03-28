import { Injectable, Logger } from '@nestjs/common';
import { NotificationCategory } from '@prisma/client';
import { InAppNotificationService } from '../../../notifications/notifications/services/in-app-notification.service';
import { formatUserName } from '../../../shared/utils/format-name.util';
import { formatDateTime } from '../../../shared/utils/format-date.util';

@Injectable()
export class BookingsNotificationService {
  private readonly logger = new Logger(BookingsNotificationService.name);

  constructor(private readonly inAppNotifications: InAppNotificationService) {}

  /** Master proposed a time — notify client to confirm or reject */
  async notifyBookingPending(
    masterId: string,
    master: {
      user: { id: string; firstName: string | null; lastName: string | null };
    },
    clientId: string | null,
    clientName: string | undefined,
    start: Date,
    bookingId: string,
  ): Promise<void> {
    try {
      const masterName = formatUserName(
        master.user.firstName,
        master.user.lastName,
      );

      // Notify client to confirm
      if (clientId) {
        await this.inAppNotifications.notify({
          userId: clientId,
          category: NotificationCategory.BOOKING_PENDING,
          title: 'Мастер предложил время',
          message: `${masterName || 'Мастер'} предложил встречу на ${formatDateTime(start)}. Подтвердите или отклоните.`,
          metadata: {
            bookingId,
            masterId,
            masterName: masterName || undefined,
            clientName: clientName || undefined,
            startTime: formatDateTime(start),
          },
          priority: 'high',
        });
      }
    } catch (error) {
      this.logger.warn(
        `Failed to send booking pending notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Client booked time — notify master to confirm or reject */
  async notifyBookingPendingForMaster(
    masterId: string,
    master: {
      user: { id: string; firstName: string | null; lastName: string | null };
    },
    clientId: string | null,
    clientName: string | undefined,
    start: Date,
    bookingId: string,
  ): Promise<void> {
    try {
      await this.inAppNotifications.notify({
        userId: master.user.id,
        category: NotificationCategory.BOOKING_PENDING,
        title: 'Новая запись от клиента',
        message: `${clientName || 'Клиент'} хочет записаться на ${formatDateTime(start)}. Подтвердите или отклоните.`,
        metadata: {
          bookingId,
          masterId,
          masterName:
            formatUserName(master.user.firstName, master.user.lastName) ||
            undefined,
          clientName: clientName || undefined,
          startTime: formatDateTime(start),
        },
        priority: 'high',
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send booking pending for master notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async notifyBookingConfirmed(
    masterId: string,
    master: {
      user: { id: string; firstName: string | null; lastName: string | null };
    },
    clientId: string | null,
    clientName: string | undefined,
    start: Date,
    bookingId: string,
  ): Promise<void> {
    try {
      const masterName = formatUserName(
        master.user.firstName,
        master.user.lastName,
      );

      await this.inAppNotifications.notifyBookingConfirmed(
        master.user.id,
        clientId,
        {
          bookingId,
          masterId,
          masterName: masterName || undefined,
          clientName: clientName || undefined,
          startTime: formatDateTime(start),
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send booking notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async notifyBookingCancelled(booking: {
    master: {
      user: { id: string; firstName: string | null; lastName: string | null };
    };
    masterId: string;
    id: string;
    clientId: string | null;
    clientName: string | null;
    startTime: Date;
  }): Promise<void> {
    try {
      const masterName = formatUserName(
        booking.master.user.firstName,
        booking.master.user.lastName,
      );

      await this.inAppNotifications.notifyBookingCancelled(
        booking.master.user.id,
        booking.clientId,
        {
          bookingId: booking.id,
          masterId: booking.masterId,
          masterName: masterName || undefined,
          clientName: booking.clientName || undefined,
          startTime: formatDateTime(booking.startTime),
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send booking cancellation notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Запись переведена в COMPLETED — лид мог закрыться в БД без отдельного PATCH /leads.
   * In-app + WebSocket (LEAD_STATUS_UPDATED) обновляют кэш клиента (Leads/Bookings).
   */
  async notifyBookingCompletedForClient(booking: {
    id: string;
    leadId: string | null;
    masterId: string;
    clientId: string | null;
    master: {
      user: { id: string; firstName: string | null; lastName: string | null };
    };
  }): Promise<void> {
    if (!booking.clientId) return;
    try {
      const masterName = formatUserName(
        booking.master.user.firstName,
        booking.master.user.lastName,
      );
      await this.inAppNotifications.notify({
        userId: booking.clientId,
        category: NotificationCategory.LEAD_STATUS_UPDATED,
        title: 'Запись выполнена',
        message: masterName
          ? `Услуга у ${masterName} завершена. Можно оставить отзыв.`
          : 'Запись завершена. Можно оставить отзыв.',
        metadata: {
          bookingId: booking.id,
          leadId: booking.leadId ?? undefined,
          masterId: booking.masterId,
          status: 'COMPLETED',
        },
        priority: 'normal',
      });
    } catch (error) {
      this.logger.warn(
        `Failed to notify client booking completed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
