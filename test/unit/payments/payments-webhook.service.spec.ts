import { PaymentStatus } from '@prisma/client';
import { PaymentsWebhookService } from '../../../src/modules/payments/services/payments-webhook.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { NotificationEventEmitter } from '../../../src/modules/notifications/events';
import type { CacheService } from '../../../src/modules/shared/cache/cache.service';

type PrismaPaymentsWebhookMock = {
  payment: { findUnique: jest.Mock; update: jest.Mock };
  master: { update: jest.Mock; findUnique: jest.Mock };
};

describe('PaymentsWebhookService', () => {
  const prisma: PrismaPaymentsWebhookMock = {
    payment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    master: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const notificationEvents = {
    notifyPaymentSuccess: jest.fn(),
    sendPaymentConfirmation: jest.fn(),
  } as unknown as jest.Mocked<NotificationEventEmitter>;

  const cache = {
    del: jest.fn(),
    invalidate: jest.fn(),
    invalidateMasterRelated: jest.fn().mockResolvedValue(undefined),
    keys: {
      userMasterProfile: jest.fn(
        (userId: string) => `cache:user:${userId}:master-profile`,
      ),
      userProfile: jest.fn((userId: string) => `cache:user:${userId}:profile`),
    },
  } as unknown as jest.Mocked<CacheService>;

  const auditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  let service: PaymentsWebhookService;

  beforeEach(() => {
    jest.clearAllMocks();
    auditService.log.mockResolvedValue(undefined);
    service = new PaymentsWebhookService(
      prisma as unknown as PrismaService,
      notificationEvents,
      cache,
      auditService as never,
    );
  });

  it('returns early when payment does not exist', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);

    await service.completeMiaTariffPayment('p1');

    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(prisma.master.update).not.toHaveBeenCalled();
  });

  it('returns early when provider is not MIA', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'p1',
      status: PaymentStatus.PENDING,
      metadata: { provider: 'OTHER' },
      tariffType: 'VIP',
      masterId: 'm1',
      amount: '100',
    } as never);

    await service.completeMiaTariffPayment('p1');

    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(prisma.master.update).not.toHaveBeenCalled();
  });

  it('completes MIA tariff payment and invalidates related caches', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'p1',
      status: PaymentStatus.PENDING,
      metadata: { provider: 'MIA', days: 10 },
      tariffType: 'VIP',
      masterId: 'm1',
      amount: 100,
    } as never);
    prisma.payment.update.mockResolvedValue({ id: 'p1' } as never);
    prisma.master.update.mockResolvedValue({ userId: 'u1' } as never);
    prisma.master.findUnique.mockResolvedValue({ userId: 'u1' } as never);
    notificationEvents.notifyPaymentSuccess.mockReturnValue(undefined);

    await service.completeMiaTariffPayment('p1');

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: PaymentStatus.SUCCESS, paidAt: expect.any(Date) },
    });
    expect(prisma.master.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: expect.objectContaining({
        tariffType: 'VIP',
        isFeatured: true,
        tariffCancelAtPeriodEnd: false,
        pendingUpgradeTo: null,
        pendingUpgradeCreatedAt: null,
      }),
      select: { userId: true },
    });

    expect(cache.del).toHaveBeenCalledWith('cache:user:u1:master-profile');
    expect(cache.del).toHaveBeenCalledWith('cache:user:u1:profile');
    expect(cache.invalidateMasterRelated).toHaveBeenCalledWith('m1');
    expect(notificationEvents.notifyPaymentSuccess).toHaveBeenCalledWith('u1', {
      paymentId: 'p1',
      tariffType: 'VIP',
      amount: '100',
    });
  });
});
