import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsMiaService } from './services/payments-mia.service';
import { PaymentsWebhookService } from './services/payments-webhook.service';
import { PaymentsQueryService } from './services/payments-query.service';
import { PaymentsUpgradeService } from './services/payments-upgrade.service';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
export declare class PaymentsService {
    private readonly miaService;
    private readonly webhookService;
    private readonly queryService;
    private readonly upgradeService;
    constructor(miaService: PaymentsMiaService, webhookService: PaymentsWebhookService, queryService: PaymentsQueryService, upgradeService: PaymentsUpgradeService);
    createCheckoutSession(dto: CreatePaymentDto, userId: string): Promise<{
        qrUrl: string;
        qrId: string;
        orderId: string;
        paymentId: string;
    }>;
    createMiaCheckout(dto: CreatePaymentDto, userId: string): Promise<{
        qrUrl: string;
        qrId: string;
        orderId: string;
        paymentId: string;
    }>;
    handleMiaCallback(orderId: string): Promise<{
        received: boolean;
    }>;
    simulateMiaSandboxPayment(paymentId: string, userId: string): Promise<{
        ok: boolean;
        orderId: string;
        qrStatus: string;
    }>;
    getPaymentsForMaster(masterId: string, authUser: JwtUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        amount: import("@prisma/client-runtime-utils").Decimal;
        userId: string;
        tariffType: import("@prisma/client").$Enums.TariffType;
        status: import("@prisma/client").$Enums.PaymentStatus;
        expiresAt: Date | null;
        metadata: import(".prisma/client/runtime/client").JsonValue | null;
        masterId: string;
        currency: string;
        stripeId: string | null;
        stripeSession: string | null;
        paidAt: Date | null;
    }[]>;
    getPaymentStats(masterId: string, authUser: JwtUser): Promise<{
        totalPayments: number;
        totalRevenue: number | import("@prisma/client-runtime-utils").Decimal;
        recentPayments: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            amount: import("@prisma/client-runtime-utils").Decimal;
            userId: string;
            tariffType: import("@prisma/client").$Enums.TariffType;
            status: import("@prisma/client").$Enums.PaymentStatus;
            expiresAt: Date | null;
            metadata: import(".prisma/client/runtime/client").JsonValue | null;
            masterId: string;
            currency: string;
            stripeId: string | null;
            stripeSession: string | null;
            paidAt: Date | null;
        }[];
    }>;
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
    private validateMasterAccess;
}
