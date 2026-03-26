import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsUpgradeService } from '../../../src/modules/payments/services/payments-upgrade.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { PaymentsMiaService } from '../../../src/modules/payments/services/payments-mia.service';

type PrismaPaymentsUpgradeMock = {
  master: { findUnique: jest.Mock; update: jest.Mock };
};

describe('PaymentsUpgradeService', () => {
  const prisma: PrismaPaymentsUpgradeMock = {
    master: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const miaService = {
    createTariffQrPayment: jest.fn(),
  } as unknown as jest.Mocked<PaymentsMiaService>;

  const auditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  let service: PaymentsUpgradeService;

  beforeEach(() => {
    jest.clearAllMocks();
    auditService.log.mockResolvedValue(undefined);
    service = new PaymentsUpgradeService(
      prisma as unknown as PrismaService,
      miaService,
      auditService as never,
    );
  });

  it('throws NotFoundException when master is missing', async () => {
    prisma.master.findUnique.mockResolvedValue(null);

    await expect(service.confirmPendingUpgrade('u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('expires pending upgrade older than 12 hours and resets it', async () => {
    const oldDate = new Date(Date.now() - 13 * 60 * 60 * 1000);
    prisma.master.findUnique.mockResolvedValue({
      id: 'm1',
      pendingUpgradeTo: 'PREMIUM',
      pendingUpgradeCreatedAt: oldDate,
      tariffType: 'VIP',
      tariffExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      lifetimePremium: false,
    } as never);
    prisma.master.update.mockResolvedValue({} as never);

    await expect(service.confirmPendingUpgrade('u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(prisma.master.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { pendingUpgradeTo: null, pendingUpgradeCreatedAt: null },
    });
    expect(miaService.createTariffQrPayment).not.toHaveBeenCalled();
  });

  it('creates PREMIUM payment for valid pending upgrade and resets pending fields', async () => {
    prisma.master.findUnique.mockResolvedValue({
      id: 'm1',
      pendingUpgradeTo: 'PREMIUM',
      pendingUpgradeCreatedAt: new Date(Date.now() - 60 * 60 * 1000),
      tariffType: 'VIP',
      tariffExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      lifetimePremium: false,
    } as never);
    miaService.createTariffQrPayment.mockResolvedValue({
      qrUrl: 'https://qr.test',
      orderId: 'p1',
    } as never);
    prisma.master.update.mockResolvedValue({} as never);

    const result = await service.confirmPendingUpgrade('u1');

    expect(miaService.createTariffQrPayment).toHaveBeenCalledWith(
      { masterId: 'm1', tariffType: 'PREMIUM' },
      'u1',
    );
    expect(prisma.master.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { pendingUpgradeTo: null, pendingUpgradeCreatedAt: null },
    });
    expect(result).toEqual({ qrUrl: 'https://qr.test', orderId: 'p1' });
  });
});
