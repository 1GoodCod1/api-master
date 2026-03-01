import { Payment, TariffType } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
export type GetTariffResult = {
    tariffType: TariffType;
    tariffExpiresAt: Date | null;
    tariffCancelAtPeriodEnd: boolean;
    lifetimePremium: boolean;
    isExpired: boolean;
    pendingUpgrade: {
        to: TariffType;
        createdAt: Date;
        expiresAt: Date;
        hoursRemaining: number;
    } | null;
    lastPayment: Payment | null;
};
export declare class MastersTariffService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getTariff(userId: string): Promise<GetTariffResult>;
    updateTariff(masterId: string, tariffTypeStr: string, days: number, onCacheInvalidate?: (masterId: string, slug: string | null) => Promise<void>): Promise<{
        slug: string | null;
        lifetimePremium: boolean;
    }>;
}
