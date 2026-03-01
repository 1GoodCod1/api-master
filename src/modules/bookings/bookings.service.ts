import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { LeadStatus } from '../../common/constants';
import { PrismaService } from '../shared/database/prisma.service';
import { InAppNotificationService } from '../notifications/services/in-app-notification.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { MastersAvailabilityService } from '../masters/services/masters-availability.service';

// Допустимые переходы статусов бронирования
const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // финальный статус
  CANCELLED: [], // финальный статус
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inAppNotifications: InAppNotificationService,
    private readonly availabilityService: MastersAvailabilityService,
  ) {}

  async create(
    dto: CreateBookingDto,
    clientPhone: string,
    clientName: string | undefined,
    authUser: {
      id: string;
      role: string;
      phoneVerified?: boolean;
      masterProfile?: { id: string } | null;
    },
  ) {
    if (!authUser) {
      throw new ForbiddenException(
        'Only authorized users can create bookings. Please log in.',
      );
    }
    if (authUser.role !== 'CLIENT' && authUser.role !== 'MASTER') {
      throw new ForbiddenException(
        'Only clients or masters can create bookings.',
      );
    }

    const { masterId, startTime, endTime, notes, leadId } = dto;

    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!master) {
      throw new NotFoundException('Master not found');
    }

    let resolvedPhone = clientPhone;
    let resolvedName = clientName;
    let resolvedClientId: string | null = null;
    const resolvedLeadId: string | null = leadId ?? null;

    if (authUser.role === 'MASTER') {
      if (!leadId) {
        throw new BadRequestException(
          'Master can only create bookings from a lead (leadId required).',
        );
      }
      const masterProfileId = authUser.masterProfile?.id;
      if (!masterProfileId || masterProfileId !== masterId) {
        throw new ForbiddenException(
          'You can only create bookings for your own profile.',
        );
      }
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          masterId: true,
          status: true,
          clientPhone: true,
          clientName: true,
          clientId: true,
        },
      });
      if (!lead || lead.masterId !== masterId) {
        throw new BadRequestException(
          'Lead not found or does not belong to this master.',
        );
      }
      if (lead.status === 'CLOSED' || lead.status === 'SPAM') {
        throw new BadRequestException(
          `Cannot create booking from a ${lead.status} lead.`,
        );
      }
      resolvedPhone = lead.clientPhone;
      resolvedName = lead.clientName ?? undefined;
      resolvedClientId = lead.clientId;
    } else {
      // CLIENT
      if (authUser.phoneVerified === false) {
        throw new ForbiddenException(
          'Phone verification required to create bookings. Please verify your phone number first.',
        );
      }
      resolvedClientId = authUser.id;
      if (leadId) {
        const lead = await this.prisma.lead.findUnique({
          where: { id: leadId },
          select: { id: true, masterId: true, clientId: true, status: true },
        });
        if (!lead || lead.masterId !== masterId) {
          throw new BadRequestException(
            'Lead not found or does not belong to this master.',
          );
        }
        if (lead.status === 'CLOSED' || lead.status === 'SPAM') {
          throw new BadRequestException(
            `Cannot create booking from a ${lead.status} lead.`,
          );
        }
        if (lead.clientId !== authUser.id) {
          throw new ForbiddenException(
            'You can only create a booking for your own lead.',
          );
        }
      }
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      throw new BadRequestException('Start time must be before end time');
    }

    if (start < new Date()) {
      throw new BadRequestException('Start time cannot be in the past');
    }

    // Standard interval overlap: (A_start < B_end) AND (A_end > B_start)
    const conflictingBooking = await this.prisma.booking.findFirst({
      where: {
        masterId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (conflictingBooking) {
      throw new BadRequestException('This time slot is already booked');
    }

    // New booking is CONFIRMED: client/master chose a slot — no extra "confirm" step.
    // Lead = request; Booking = fixed appointment linked to that lead (leadId).
    const booking = await this.prisma.booking.create({
      data: {
        masterId,
        leadId: resolvedLeadId,
        clientPhone: resolvedPhone,
        clientName: resolvedName,
        clientId: resolvedClientId,
        startTime: start,
        endTime: end,
        notes,
        status: 'CONFIRMED',
      },
      include: {
        master: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                isVerified: true,
              },
            },
            city: true,
            category: true,
          },
        },
        lead: true,
      },
    });

    // FIX #1: При создании бронирования из лида — перевести лид в IN_PROGRESS
    if (resolvedLeadId) {
      try {
        await this.prisma.lead.update({
          where: { id: resolvedLeadId },
          data: {
            status: 'IN_PROGRESS',
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        console.error(
          'Failed to update lead status after booking creation:',
          error,
        );
      }
    }

    // FIX #2: Отправка уведомлений при создании бронирования
    try {
      const masterName = [master.user.firstName, master.user.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

      const formattedTime = start.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      await this.inAppNotifications.notifyBookingConfirmed(
        master.user.id,
        resolvedClientId,
        {
          bookingId: booking.id,
          masterId,
          masterName: masterName || undefined,
          clientName: resolvedName || undefined,
          startTime: formattedTime,
        },
      );
    } catch (error) {
      console.error('Failed to send booking notification:', error);
    }

    return booking;
  }

  async findAllForMaster(masterId: string, status?: string) {
    const where: Prisma.BookingWhereInput = { masterId };
    if (status && status in BookingStatus) {
      where.status = status as BookingStatus;
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        master: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                isVerified: true,
              },
            },
            city: true,
            category: true,
          },
        },
        lead: true,
      },
    });

    return bookings;
  }

  /**
   * Получить все бронирования клиента.
   * По clientId (авторизованный) или clientPhone (обратная совместимость, смена телефона).
   */
  async findAllForClient(userId: string, clientPhone: string) {
    const where: Prisma.BookingWhereInput = {
      OR: [{ clientId: userId }, { clientPhone }],
    };
    const bookings = await this.prisma.booking.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: {
        master: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                isVerified: true,
              },
            },
            city: true,
            category: true,
          },
        },
      },
    });

    return bookings;
  }

  async updateStatus(
    bookingId: string,
    masterId: string,
    dto: UpdateBookingStatusDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
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

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.masterId !== masterId) {
      throw new BadRequestException('You can only update your own bookings');
    }

    // FIX #4: Валидация допустимых переходов статусов
    const currentStatus = booking.status;
    const newStatus = dto.status;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] ?? [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition booking from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ') || 'none (final status)'}`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: dto.status,
      },
      include: {
        master: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                isVerified: true,
              },
            },
            city: true,
            category: true,
          },
        },
      },
    });

    // FIX #5 + #6: Обновление статуса лида и счётчиков мастера при изменении статуса бронирования
    if (booking.leadId) {
      try {
        const leadMasterId = booking.masterId;

        if (newStatus === 'CANCELLED') {
          // При отмене — лид в NEW + уменьшить currentActiveLeads
          await this.prisma.$transaction(async (tx) => {
            await tx.lead.update({
              where: { id: booking.leadId! },
              data: { status: 'NEW', updatedAt: new Date() },
            });
            await this.availabilityService.decrementActiveLeads(leadMasterId);
          });
        } else if (newStatus === 'COMPLETED') {
          // При завершении — закрыть лид, уменьшить счётчик
          await this.prisma.$transaction(async (tx) => {
            const lead = await tx.lead.findUnique({
              where: { id: booking.leadId! },
              select: { id: true, masterId: true, status: true },
            });

            if (lead && lead.status !== LeadStatus.CLOSED) {
              await tx.lead.update({
                where: { id: booking.leadId! },
                data: { status: LeadStatus.CLOSED, updatedAt: new Date() },
              });
              await this.availabilityService.decrementActiveLeads(
                lead.masterId,
              );
            }
          });
        }
      } catch (error) {
        console.error(
          'Failed to update lead status after booking status change:',
          error,
        );
      }
    }

    // Уведомления при отмене бронирования
    if (newStatus === 'CANCELLED') {
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
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        await this.inAppNotifications.notifyBookingCancelled(
          booking.master.user.id,
          booking.clientId,
          {
            bookingId: booking.id,
            masterId: booking.masterId,
            masterName: masterName || undefined,
            clientName: booking.clientName || undefined,
            startTime: formattedTime,
          },
        );
      } catch (error) {
        console.error(
          'Failed to send booking cancellation notification:',
          error,
        );
      }
    }

    return updated;
  }

  async getAvailableSlots(masterId: string, date: string) {
    // Получаем настройки расписания мастера
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: {
        workStartHour: true,
        workEndHour: true,
        slotDurationMinutes: true,
      },
    });

    const workStart = master?.workStartHour ?? 9;
    const workEnd = master?.workEndHour ?? 18;
    const slotMinutes = master?.slotDurationMinutes ?? 60;

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Получаем все бронирования на этот день
    const bookings = await this.prisma.booking.findMany({
      where: {
        masterId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Генерируем доступные слоты на основе настроек мастера
    const availableSlots: { start: Date; end: Date; available: boolean }[] = [];
    const dayStartMinutes = workStart * 60;
    const dayEndMinutes = workEnd * 60;
    const now = new Date();

    for (
      let m = dayStartMinutes;
      m + slotMinutes <= dayEndMinutes;
      m += slotMinutes
    ) {
      const slotStart = new Date(startOfDay);
      slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
      const slotEnd = new Date(startOfDay);
      slotEnd.setHours(
        Math.floor((m + slotMinutes) / 60),
        (m + slotMinutes) % 60,
        0,
        0,
      );

      // Standard interval overlap: slotStart < booking.endTime AND slotEnd > booking.startTime
      const isBooked = bookings.some(
        (b) => slotStart < b.endTime && slotEnd > b.startTime,
      );
      availableSlots.push({
        start: slotStart,
        end: slotEnd,
        available: !isBooked && slotStart > now,
      });
    }

    return {
      date: targetDate.toISOString().split('T')[0],
      slots: availableSlots,
      slotDurationMinutes: slotMinutes,
      workStartHour: workStart,
      workEndHour: workEnd,
      bookings,
    };
  }

  /**
   * Calendar view for master: bookings + leads without any booking (for "Лиды без записи" column).
   * @param startDate - optional; defaults to 30 days ago
   * @param endDate - optional; defaults to 90 days ahead
   */
  async getCalendar(
    masterId: string,
    status?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const from = startDate ?? defaultStart;
    const to = endDate ?? defaultEnd;

    const where: Prisma.BookingWhereInput = {
      masterId,
      startTime: { gte: from, lte: to },
    };
    if (status && status in BookingStatus) {
      where.status = status as BookingStatus;
    }

    const [bookings, leadsWithoutBooking] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { startTime: 'asc' },
        include: {
          master: {
            include: {
              user: { select: { id: true, isVerified: true } },
              city: true,
              category: true,
            },
          },
          lead: true,
        },
      }),
      this.prisma.lead.findMany({
        where: {
          masterId,
          status: { in: ['NEW', 'IN_PROGRESS'] },
          bookings: { none: {} },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          master: {
            select: {
              id: true,
              slug: true,
              user: { select: { firstName: true, lastName: true } },
              category: { select: { id: true, name: true } },
              city: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    return { bookings, leadsWithoutBooking };
  }

  /**
   * Get rebook info from a previous completed booking.
   * Returns master info, service name, and time preferences for "Book Again" flow.
   */
  async getRebookInfo(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        master: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                isVerified: true,
              },
            },
            city: true,
            category: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Only the client who booked can rebook
    if (booking.clientId !== userId) {
      throw new ForbiddenException('You can only rebook your own appointments');
    }

    // Calculate preferred time (same hour/minute as original)
    const originalStart = new Date(booking.startTime);
    const preferredHour = originalStart.getHours();
    const preferredMinute = originalStart.getMinutes();

    // Calculate duration
    const durationMinutes = Math.round(
      (new Date(booking.endTime).getTime() -
        new Date(booking.startTime).getTime()) /
        60000,
    );

    const masterName = [
      booking.master.user.firstName,
      booking.master.user.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      masterId: booking.masterId,
      masterName: masterName || undefined,
      masterSlug: booking.master.slug,
      serviceName: booking.serviceName || undefined,
      notes: booking.notes || undefined,
      clientPhone: booking.clientPhone,
      clientName: booking.clientName || undefined,
      preferredHour,
      preferredMinute,
      durationMinutes,
      category: booking.master.category,
      city: booking.master.city,
    };
  }
}
