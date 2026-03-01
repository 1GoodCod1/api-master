import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
export declare class AdminContentService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getLeads(filters?: {
        status?: string;
        dateFrom?: Date;
        dateTo?: Date;
        page?: number;
        limit?: number;
    }): Promise<{
        leads: ({
            master: {
                user: {
                    phone: string;
                    firstName: string | null;
                    lastName: string | null;
                };
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            message: string;
            status: import("@prisma/client").$Enums.LeadStatus;
            clientName: string | null;
            clientPhone: string;
            masterId: string;
            clientId: string | null;
            spamScore: number;
            isPremium: boolean;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getRecentLeads(limit?: number): Promise<({
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
        message: string;
        status: import("@prisma/client").$Enums.LeadStatus;
        clientName: string | null;
        clientPhone: string;
        masterId: string;
        clientId: string | null;
        spamScore: number;
        isPremium: boolean;
    })[]>;
    getReviews(filters?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        reviews: ({
            master: {
                user: {
                    firstName: string | null;
                    lastName: string | null;
                };
            };
            reviewFiles: ({
                file: {
                    path: string;
                    id: string;
                    filename: string;
                    mimetype: string;
                };
            } & {
                id: string;
                createdAt: Date;
                fileId: string;
                reviewId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            rating: number;
            status: import("@prisma/client").$Enums.ReviewStatus;
            clientName: string | null;
            clientPhone: string;
            comment: string | null;
            masterId: string;
            clientId: string | null;
            moderatedBy: string | null;
            moderatedAt: Date | null;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    moderateReview(reviewId: string, status: string, reason?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        status: import("@prisma/client").$Enums.ReviewStatus;
        clientName: string | null;
        clientPhone: string;
        comment: string | null;
        masterId: string;
        clientId: string | null;
        moderatedBy: string | null;
        moderatedAt: Date | null;
    }>;
    getPayments(filters?: {
        status?: string;
        page?: number;
        limit?: number;
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
    getRecentActivity(limit?: number): Promise<({
        user: {
            email: string;
            role: import("@prisma/client").$Enums.UserRole;
        } | null;
    } & {
        id: string;
        ipAddress: string | null;
        createdAt: Date;
        userId: string | null;
        userAgent: string | null;
        action: string;
        entityType: string | null;
        entityId: string | null;
        oldData: Prisma.JsonValue | null;
        newData: Prisma.JsonValue | null;
    })[]>;
}
