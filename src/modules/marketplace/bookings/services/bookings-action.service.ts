import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
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
  private readonly logger = new Logger(BookingsActionService.name);

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

    // Both master and client create bookings as PENDING.
    // Master must confirm client bookings; client must confirm master bookings.
    const initialStatus: BookingStatus = 'PENDING';

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
        status: initialStatus,
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

    const isMasterCreating = authUser.role === 'MASTER';

    if (isMasterCreating) {
      // Master proposed time → notify client to confirm/reject
      void this.notifications
        .notifyBookingPending(
          masterId,
          master,
          resolved.resolvedClientId,
          resolved.resolvedName,
          start,
          booking.id,
        )
        .catch((e) => this.logger.error('notifyBookingPending failed', e));
    } else {
      // Client booked → notify master to confirm/reject
      void this.notifications
        .notifyBookingPendingForMaster(
          masterId,
          master,
          resolved.resolvedClientId,
          resolved.resolvedName,
          start,
          booking.id,
        )
        .catch((e) =>
          this.logger.error('notifyBookingPendingForMaster failed', e),
        );
    }

    return booking;
  }

  /**
   * Client confirms a PENDING booking proposed by master.
   */
  async clientConfirm(bookingId: string, clientUserId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        master: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.clientId !== clientUserId) {
      throw new BadRequestException('You can only confirm your own bookings');
    }
    if (booking.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot confirm booking with status ${booking.status}. Only PENDING bookings can be confirmed.`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
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

    // Now that client confirmed, move lead to IN_PROGRESS
    void this.leadSync
      .updateLeadStatusOnCreate(booking.leadId)
      .catch((e) =>
        this.logger.error('updateLeadStatusOnCreate (confirm) failed', e),
      );
    void this.notifications
      .notifyBookingConfirmed(
        booking.masterId,
        booking.master,
        booking.clientId,
        booking.clientName ?? undefined,
        booking.startTime,
        booking.id,
      )
      .catch((e) => this.logger.error('notifyBookingConfirmed failed', e));

    return updated;
  }

  /**
   * Client rejects a PENDING booking proposed by master.
   */
  async clientReject(bookingId: string, clientUserId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        master: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.clientId !== clientUserId) {
      throw new BadRequestException('You can only reject your own bookings');
    }
    if (booking.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot reject booking with status ${booking.status}. Only PENDING bookings can be rejected.`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
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

    void this.notifications
      .notifyBookingCancelled(updated)
      .catch((e) => this.logger.error('notifyBookingCancelled failed', e));

    return updated;
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

    void this.leadSync
      .updateLeadOnStatusChange(booking, newStatus)
      .catch((e) => this.logger.error('updateLeadOnStatusChange failed', e));

    if (newStatus === 'CONFIRMED') {
      void this.notifications
        .notifyBookingConfirmed(
          booking.masterId,
          booking.master,
          booking.clientId,
          booking.clientName ?? undefined,
          booking.startTime,
          booking.id,
        )
        .catch((e) => this.logger.error('notifyBookingConfirmed failed', e));
    } else if (newStatus === 'CANCELLED') {
      void this.notifications
        .notifyBookingCancelled(booking)
        .catch((e) => this.logger.error('notifyBookingCancelled failed', e));
    }

    return updated;
  }
}
