import { PrismaService } from '../../shared/database/prisma.service';
import { PaymentsMiaService } from './payments-mia.service';
export declare class PaymentsUpgradeService {
    private readonly prisma;
    private readonly miaService;
    constructor(prisma: PrismaService, miaService: PaymentsMiaService);
    confirmPendingUpgrade(userId: string): Promise<{
        qrUrl: string;
        qrId: string;
        orderId: string;
        paymentId: string;
    }>;
    cancelPendingUpgrade(userId: string): Promise<{
        message: string;
    }>;
    cancelTariffAtPeriodEnd(userId: string): Promise<{
        message: string;
        tariffExpiresAt: Date;
    }>;
    private resetPendingUpgrade;
}
