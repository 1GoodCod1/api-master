import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { BookingStatus } from '../../../../common/constants';
import {
  AppErrors,
  AppErrorMessages,
  AppErrorTemplates,
} from '../../../../common/errors';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingStatusDto } from '../dto/update-booking-status.dto';
import type { BookingsAuthUser } from '../types/bookings-auth-user.types';
import { BookingsValidationService } from './bookings-validation.service';
import { BookingsLeadSyncService } from './bookings-lead-sync.service';
import { BookingsNotificationService } from './bookings-notification.service';
import { fireAndForget } from '../../../../common/utils/fire-and-forget';

const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
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
      throw AppErrors.notFound(AppErrorMessages.MASTER_NOT_FOUND);
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

    // И мастер, и клиент создают запись со статусом PENDING.
    // Мастер подтверждает запись клиента; клиент — запись, предложенную мастером.
    const initialStatus: BookingStatus = BookingStatus.PENDING;

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

    const isMasterCreating = authUser.role === UserRole.MASTER;

    if (isMasterCreating) {
      // Мастер предложил время → уведомить клиента подтвердить/отклонить
      this.notifications.notifyBookingPending(
        masterId,
        master,
        resolved.resolvedClientId,
        resolved.resolvedName,
        start,
        booking.id,
      );
    } else {
      this.notifications.notifyBookingPendingForMaster(
        masterId,
        master,
        resolved.resolvedClientId,
        resolved.resolvedName,
        start,
        booking.id,
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

    if (!booking) throw AppErrors.notFound(AppErrorMessages.BOOKING_NOT_FOUND);
    if (booking.clientId !== clientUserId) {
      throw AppErrors.badRequest(AppErrorMessages.BOOKING_CONFIRM_OWN_ONLY);
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw AppErrors.badRequest(
        AppErrorTemplates.confirmBookingWrongStatus(booking.status),
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
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

    // После подтверждения клиентом переводим лид в IN_PROGRESS
    void this.leadSync
      .updateLeadStatusOnCreate(booking.leadId)
      .catch((e) =>
        this.logger.error('updateLeadStatusOnCreate (confirm) failed', e),
      );
    this.notifications.notifyBookingConfirmed(
      booking.masterId,
      booking.master,
      booking.clientId,
      booking.clientName ?? undefined,
      booking.startTime,
      booking.id,
    );

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

    if (!booking) throw AppErrors.notFound(AppErrorMessages.BOOKING_NOT_FOUND);
    if (booking.clientId !== clientUserId) {
      throw AppErrors.badRequest(AppErrorMessages.BOOKING_REJECT_OWN_ONLY);
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw AppErrors.badRequest(
        AppErrorTemplates.rejectBookingWrongStatus(booking.status),
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
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

    this.notifications.notifyBookingCancelled(updated);

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
      throw AppErrors.notFound(AppErrorMessages.BOOKING_NOT_FOUND);
    }

    if (booking.masterId !== masterId) {
      throw AppErrors.badRequest(AppErrorMessages.BOOKING_UPDATE_OWN_ONLY);
    }

    const currentStatus = booking.status;
    const newStatus = dto.status;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] ?? [];

    if (!allowedTransitions.includes(newStatus)) {
      throw AppErrors.badRequest(
        AppErrorTemplates.bookingStatusTransition(
          currentStatus,
          newStatus,
          allowedTransitions,
        ),
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

    fireAndForget(
      this.leadSync.updateLeadOnStatusChange(booking, newStatus),
      this.logger,
      'updateLeadOnStatusChange',
    );

    if (newStatus === BookingStatus.CONFIRMED) {
      this.notifications.notifyBookingConfirmed(
        booking.masterId,
        booking.master,
        booking.clientId,
        booking.clientName ?? undefined,
        booking.startTime,
        booking.id,
      );
    } else if (newStatus === BookingStatus.CANCELLED) {
      this.notifications.notifyBookingCancelled(booking);
    } else if (newStatus === BookingStatus.COMPLETED) {
      this.notifications.notifyBookingCompletedForClient({
        id: updated.id,
        leadId: booking.leadId,
        masterId: booking.masterId,
        clientId: booking.clientId,
        master: booking.master,
      });
    }

    return updated;
  }
}
