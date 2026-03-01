import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
export declare class AdminPaymentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPayments(filters?: {
        status?: string;
        page?: number;
        limit?: number;
        cursor?: string;
    }): Promise<{
        payments: ({
            user: {
                email: string;
                phone: string;
            };
            master: {
                user: {
                    firstName: string | null;
                    lastName: string | null;
                };
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            amount: Prisma.Decimal;
            userId: string;
            tariffType: import("@prisma/client").$Enums.TariffType;
            status: import("@prisma/client").$Enums.PaymentStatus;
            expiresAt: Date | null;
            metadata: Prisma.JsonValue | null;
            masterId: string;
            currency: string;
            stripeId: string | null;
            stripeSession: string | null;
            paidAt: Date | null;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            nextCursor: string | null;
        };
    }>;
    getRecentPayments(limit?: number): Promise<({
        user: {
            email: string;
            phone: string;
        };
        master: {
            user: {
                firstName: string | null;
                lastName: string | null;
            };
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        amount: Prisma.Decimal;
        userId: string;
        tariffType: import("@prisma/client").$Enums.TariffType;
        status: import("@prisma/client").$Enums.PaymentStatus;
        expiresAt: Date | null;
        metadata: Prisma.JsonValue | null;
        masterId: string;
        currency: string;
        stripeId: string | null;
        stripeSession: string | null;
        paidAt: Date | null;
    })[]>;
}
