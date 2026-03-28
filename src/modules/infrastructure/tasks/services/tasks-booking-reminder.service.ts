import { Injectable, Logger } from '@nestjs/common';
import { NotificationCategory } from '@prisma/client';
import { ACTIVE_BOOKING_STATUSES } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { InAppNotificationService } from '../../../notifications/notifications/services/in-app-notification.service';

/**
 * TasksBookingReminderService — автоматические напоминания о бронированиях
 *
 * Отправляет напоминания за 24ч и 1ч до начала встречи.
 * Вызывается из TasksService по расписанию.
 */
@Injectable()
export class TasksBookingReminderService {
  private readonly logger = new Logger(TasksBookingReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inAppNotifications: InAppNotificationService,
  ) {}

  /**
   * Напоминания о бронированиях за 24ч и за 1ч до начала.
   * Вызывается ежечасно из TasksService.
   */
  async sendBookingReminders() {
    const now = new Date();

    // Напоминания за 24ч: записи через 23–25 ч от текущего момента
    const twentyThreeHours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const twentyFiveHours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Напоминания за 1ч: записи через 30–90 мин от текущего момента
    const thirtyMinutes = new Date(now.getTime() + 30 * 60 * 1000);
    const ninetyMinutes = new Date(now.getTime() + 90 * 60 * 1000);

    await Promise.all([
      this.processReminders('24h', twentyThreeHours, twentyFiveHours),
      this.processReminders('1h', thirtyMinutes, ninetyMinutes),
    ]);
  }

  private async processReminders(type: '24h' | '1h', from: Date, to: Date) {
    try {
      // Поиск бронирований в диапазоне, по которым ещё не отправлено напоминание
      const bookings = await this.prisma.booking.findMany({
        where: {
          startTime: { gte: from, lte: to },
          status: { in: [...ACTIVE_BOOKING_STATUSES] },
          reminders: {
            none: { type },
          },
        },
        include: {
          master: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });

      if (!bookings.length) return;

      this.logger.log(
        `Processing ${bookings.length} ${type} booking reminders`,
      );

      for (const booking of bookings) {
        try {
          const masterName = [
            booking.master.user.firstName,
            booking.master.user.lastName,
          ]
            .filter(Boolean)
            .join(' ')
            .trim();

          const formattedTime = booking.startTime.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });

          const timeLabel = type === '24h' ? 'через 24 часа' : 'через 1 час';

          // Уведомление мастеру
          await this.inAppNotifications.notify({
            userId: booking.master.user.id,
            category: NotificationCategory.BOOKING_REMINDER,
            title: 'Напоминание о записи',
            message: `Запись с ${booking.clientName || 'клиентом'} ${timeLabel} (${formattedTime})`,
            metadata: {
              bookingId: booking.id,
              masterId: booking.masterId,
              startTime: booking.startTime.toISOString(),
              reminderType: type,
            },
            priority: type === '1h' ? 'high' : 'normal',
          });

          // Уведомить клиента (если зарегистрирован)
          if (booking.clientId) {
            await this.inAppNotifications.notify({
              userId: booking.clientId,
              category: NotificationCategory.BOOKING_REMINDER,
              title: 'Напоминание о записи',
              message: `Запись к ${masterName || 'мастеру'} ${timeLabel} (${formattedTime})`,
              metadata: {
                bookingId: booking.id,
                masterId: booking.masterId,
                masterName,
                startTime: booking.startTime.toISOString(),
                reminderType: type,
              },
            });
          }

          // Отмечаем напоминание как отправленное
          await this.prisma.bookingReminder.create({
            data: {
              bookingId: booking.id,
              type,
              sentAt: new Date(),
            },
          });
        } catch (error) {
          this.logger.error(
            `Failed to send ${type} reminder for booking ${booking.id}: ${error}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process ${type} reminders: ${error}`);
    }
  }
}
