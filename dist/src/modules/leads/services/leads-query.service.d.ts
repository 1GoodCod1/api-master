import { PrismaService } from '../../shared/database/prisma.service';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { CacheService } from '../../shared/cache/cache.service';
import { type PaginatedResult } from '../../shared/pagination/cursor-pagination';
export declare class LeadsQueryService {
    private readonly prisma;
    private readonly cache;
    constructor(prisma: PrismaService, cache: CacheService);
    findAll(authUser: JwtUser, options?: {
        status?: string;
        limit?: number;
        cursor?: string;
        page?: number;
    }): Promise<PaginatedResult<unknown>>;
    private findAllForMaster;
    private findAllForClient;
    findOne(idOrEncoded: string, authUser: JwtUser): Promise<{
        master: {
            id: string;
            user: {
                firstName: string | null;
                lastName: string | null;
            };
            slug: string | null;
            category: {
                id: string;
                name: string;
            };
            city: {
                id: string;
                name: string;
            };
        };
        client: {
            firstName: string | null;
            lastName: string | null;
        } | null;
        files: ({
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
            leadId: string;
        })[];
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
    }>;
    getStats(authUser: JwtUser): Promise<{
        total: number;
        byStatus: {
            newLeads: number;
            inProgress: number;
            closed: number;
            spam: number;
        };
    }>;
}
