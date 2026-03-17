import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingsService } from '../../../src/modules/bookings/bookings.service';
import type { BookingsQueryService } from '../../../src/modules/bookings/services/bookings-query.service';
import type { BookingsActionService } from '../../../src/modules/bookings/services/bookings-action.service';

describe('BookingsService', () => {
  const queryService = {} as unknown as jest.Mocked<BookingsQueryService>;

  const actionService = {
    updateStatus: jest.fn(),
  } as unknown as jest.Mocked<Pick<BookingsActionService, 'updateStatus'>>;

  let service: BookingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookingsService(
      queryService,
      actionService as unknown as BookingsActionService,
    );
  });

  it('throws NotFoundException when booking does not exist', async () => {
    actionService.updateStatus.mockRejectedValue(new NotFoundException());

    await expect(
      service.updateStatus('b1', 'm1', { status: 'CANCELLED' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when master tries to update foreign booking', async () => {
    actionService.updateStatus.mockRejectedValue(new BadRequestException());

    await expect(
      service.updateStatus('b1', 'm1', { status: 'CANCELLED' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException for invalid status transition', async () => {
    actionService.updateStatus.mockRejectedValue(new BadRequestException());

    await expect(
      service.updateStatus('b1', 'm1', { status: 'CONFIRMED' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates status to CANCELLED and sends cancellation notification', async () => {
    const updated = { id: 'b1', status: 'CANCELLED' };
    actionService.updateStatus.mockResolvedValue(
      updated as Awaited<ReturnType<BookingsActionService['updateStatus']>>,
    );

    const result = await service.updateStatus('b1', 'm1', {
      status: 'CANCELLED',
    });

    expect(result).toEqual(updated);
    expect(actionService.updateStatus).toHaveBeenCalledWith(
      'b1',
      'm1',
      expect.objectContaining({ status: 'CANCELLED' }),
    );
  });
});
