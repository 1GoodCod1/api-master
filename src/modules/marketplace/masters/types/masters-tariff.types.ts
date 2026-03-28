import type { Payment, TariffType } from '@prisma/client';

export type GetTariffResult = {
  tariffType: TariffType;
  tariffExpiresAt: Date | null;
  tariffCancelAtPeriodEnd: boolean;
  isExpired: boolean;
  pendingUpgrade: {
    to: TariffType;
    createdAt: Date;
    expiresAt: Date;
    hoursRemaining: number;
  } | null;
  lastPayment: Payment | null;
};
