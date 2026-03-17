import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingStatusDto } from '../dto/update-booking-status.dto';
import type { BookingsAuthUser } from '../types/bookings-auth-user.types';
import { BookingsValidationService } from './bookings-validation.service';
import { BookingsLeadSyncService } from './bookings-lead-sync.service';
import { BookingsNotificationService } from './bookings-notification.service';

const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class BookingsActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: BookingsValidationService,
    private readonly leadSync: BookingsLeadSyncService,
    private readonly notifications: BookingsNotificationService,
  ) {}

  async create(
    dto: CreateBookingDto,
    clientPhone: string,
    clientName: string | undefined,
    authUser: BookingsAuthUser,
  ) {
    this.validation.validateCreateAuth(authUser);

    const { masterId, startTime, endTime, notes } = dto;

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

    const resolved = await this.validation.resolveClientData(
      dto,
      clientPhone,
      clientName,
      authUser,
    );

    const start = new Date(startTime);
    const end = new Date(endTime);

    this.validation.validateTimeSlot(start, end);
    await this.validation.ensureNoConflict(masterId, start, end);

    const booking = await this.prisma.booking.create({
      data: {
        masterId,
        leadId: resolved.resolvedLeadId,
        clientPhone: resolved.resolvedPhone,
        clientName: resolved.resolvedName,
        clientId: resolved.resolvedClientId,
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

    void this.leadSync.updateLeadStatusOnCreate(resolved.resolvedLeadId);
    void this.notifications.notifyBookingConfirmed(
      masterId,
      master,
      resolved.resolvedClientId,
      resolved.resolvedName,
      start,
      booking.id,
    );

    return booking;
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
      data: { status: dto.status },
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

    void this.leadSync.updateLeadOnStatusChange(booking, newStatus);
    if (newStatus === 'CANCELLED') {
      void this.notifications.notifyBookingCancelled(booking);
    }

    return updated;
  }
}
