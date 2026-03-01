import { PrismaService } from '../../shared/database/prisma.service';
export declare class PaymentsQueryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPaymentsForMaster(masterId: string): Promise<{
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
    getPaymentStats(masterId: string): Promise<{
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
}
