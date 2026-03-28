import { Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { Prisma } from '@prisma/client';
import {
  ACTIVE_BOOKING_STATUSES,
  ACTIVE_LEAD_STATUSES,
  BookingStatus,
} from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  SORT_ASC,
  SORT_DESC,
} from '../../../shared/constants/sort-order.constants';
import { formatUserName } from '../../../shared/utils/format-name.util';

const BOOKING_INCLUDE_MASTER = {
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
} as const;

@Injectable()
export class BookingsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForMaster(masterId: string, status?: string) {
    const where: Prisma.BookingWhereInput = { masterId };
    if (status && status in BookingStatus) {
      where.status = status as BookingStatus;
    }

    return this.prisma.booking.findMany({
      where,
      orderBy: { startTime: SORT_ASC },
      include: BOOKING_INCLUDE_MASTER,
    });
  }

  async findAllForClient(userId: string, clientPhone: string) {
    const where: Prisma.BookingWhereInput = {
      OR: [{ clientId: userId }, { clientPhone }],
    };

    return this.prisma.booking.findMany({
      where,
      orderBy: { startTime: SORT_DESC },
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
  }

  async getAvailableSlots(masterId: string, date: string) {
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

    const bookings = await this.prisma.booking.findMany({
      where: {
        masterId,
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
      orderBy: { startTime: SORT_ASC },
    });

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
        orderBy: { startTime: SORT_ASC },
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
          status: { in: [...ACTIVE_LEAD_STATUSES] },
          bookings: { none: {} },
        },
        orderBy: { createdAt: SORT_DESC },
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

  getCalendarFromQuery(
    masterId: string,
    status?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.getCalendar(masterId, status, start, end);
  }

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
      throw AppErrors.notFound(AppErrorMessages.BOOKING_NOT_FOUND);
    }

    if (booking.clientId !== userId) {
      throw AppErrors.forbidden(AppErrorMessages.BOOKING_REBOOK_OWN_ONLY);
    }

    const originalStart = new Date(booking.startTime);
    const preferredHour = originalStart.getHours();
    const preferredMinute = originalStart.getMinutes();
    const durationMinutes = Math.round(
      (new Date(booking.endTime).getTime() -
        new Date(booking.startTime).getTime()) /
        60000,
    );

    const masterName = formatUserName(
      booking.master.user.firstName,
      booking.master.user.lastName,
    );

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
