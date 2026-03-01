import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingsService } from '../../../src/modules/bookings/bookings.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { InAppNotificationService } from '../../../src/modules/notifications/services/in-app-notification.service';
import type { MastersAvailabilityService } from '../../../src/modules/masters/services/masters-availability.service';

type PrismaBookingsMock = {
  booking: { findUnique: jest.Mock; update: jest.Mock };
  $transaction: jest.Mock;
};

describe('BookingsService', () => {
  const prisma: PrismaBookingsMock = {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const inAppNotifications = {
    notifyBookingCancelled: jest.fn(),
  } as unknown as jest.Mocked<InAppNotificationService>;

  const availabilityService = {
    decrementActiveLeads: jest.fn(),
  } as unknown as jest.Mocked<MastersAvailabilityService>;

  let service: BookingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookingsService(
      prisma as unknown as PrismaService,
      inAppNotifications,
      availabilityService,
    );
  });

  it('throws NotFoundException when booking does not exist', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);

    await expect(
      service.updateStatus('b1', 'm1', { status: 'CANCELLED' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when master tries to update foreign booking', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b1',
      masterId: 'm-other',
      status: 'CONFIRMED',
      leadId: null,
      clientId: 'c1',
      clientName: 'Client',
      startTime: new Date('2030-01-01T10:00:00Z'),
      master: {
        user: { id: 'u-master', firstName: 'John', lastName: 'Doe' },
      },
    } as never);

    await expect(
      service.updateStatus('b1', 'm1', { status: 'CANCELLED' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException for invalid status transition', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b1',
      masterId: 'm1',
      status: 'COMPLETED',
      leadId: null,
      clientId: 'c1',
      clientName: 'Client',
      startTime: new Date('2030-01-01T10:00:00Z'),
      master: {
        user: { id: 'u-master', firstName: 'John', lastName: 'Doe' },
      },
    } as never);

    await expect(
      service.updateStatus('b1', 'm1', { status: 'CONFIRMED' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('updates status to CANCELLED and sends cancellation notification', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b1',
      masterId: 'm1',
      status: 'CONFIRMED',
      leadId: null,
      clientId: 'c1',
      clientName: 'Client Name',
      startTime: new Date('2030-01-01T10:00:00Z'),
      master: {
        user: { id: 'u-master', firstName: 'John', lastName: 'Doe' },
      },
    } as never);
    prisma.booking.update.mockResolvedValue({
      id: 'b1',
      status: 'CANCELLED',
    } as never);
    inAppNotifications.notifyBookingCancelled.mockResolvedValue({} as never);

    await service.updateStatus('b1', 'm1', { status: 'CANCELLED' });

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { status: 'CANCELLED' },
      include: expect.any(Object),
    });
    expect(inAppNotifications.notifyBookingCancelled).toHaveBeenCalledWith(
      'u-master',
      'c1',
      expect.objectContaining({
        bookingId: 'b1',
        masterId: 'm1',
        masterName: 'John Doe',
      }),
    );
  });
});
