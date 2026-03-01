import { PrismaService } from '../../shared/database/prisma.service';
export declare class AdminLeadsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getLeads(filters?: {
        status?: string;
        dateFrom?: Date;
        dateTo?: Date;
        page?: number;
        limit?: number;
        cursor?: string;
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
            nextCursor: string | null;
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
}
