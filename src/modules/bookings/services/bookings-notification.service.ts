import { Injectable, Logger } from '@nestjs/common';
import { InAppNotificationService } from '../../notifications/services/in-app-notification.service';
import { formatUserName } from '../../shared/utils/format-name.util';
import { formatDateTime } from '../../shared/utils/format-date.util';

@Injectable()
export class BookingsNotificationService {
  private readonly logger = new Logger(BookingsNotificationService.name);

  constructor(private readonly inAppNotifications: InAppNotificationService) {}

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
}
