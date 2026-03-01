import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createMiaCheckout(createPaymentDto: CreatePaymentDto, user: JwtUser): Promise<{
        qrUrl: string;
        qrId: string;
        orderId: string;
        paymentId: string;
    }>;
    createCheckout(createPaymentDto: CreatePaymentDto, user: JwtUser): Promise<{
        qrUrl: string;
        qrId: string;
        orderId: string;
        paymentId: string;
    }>;
    miaCallback(body: {
        orderId?: string;
    }): Promise<{
        received: boolean;
    }>;
    miaSandboxSimulate(body: {
        paymentId: string;
    }, user: JwtUser): Promise<{
        ok: boolean;
        orderId: string;
        qrStatus: string;
    }>;
    getPaymentsForMaster(masterId: string, user: JwtUser): Promise<{
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
    getPaymentStats(masterId: string, user: JwtUser): Promise<{
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
    getMyPayments(user: JwtUser): Promise<{
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
    confirmPendingUpgrade(user: JwtUser): Promise<{
        qrUrl: string;
        qrId: string;
        orderId: string;
        paymentId: string;
    }>;
    cancelPendingUpgrade(user: JwtUser): Promise<{
        message: string;
    }>;
    cancelTariffAtPeriodEnd(user: JwtUser): Promise<{
        message: string;
        tariffExpiresAt: Date;
    }>;
}
