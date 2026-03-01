import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { type PaginatedResult } from '../../shared/pagination/cursor-pagination';
export declare class ReviewsQueryService {
    private readonly prisma;
    private readonly cache;
    constructor(prisma: PrismaService, cache: CacheService);
    findAllForMaster(masterId: string, options?: {
        status?: string;
        limit?: number;
        cursor?: string;
        page?: number;
        sortOrder?: 'asc' | 'desc';
    }): Promise<PaginatedResult<unknown>>;
    getStats(masterId: string): Promise<{
        total: number;
        byStatus: {
            visible: number;
            pending: number;
            hidden: number;
            reported: number;
        };
        ratingDistribution: Record<number, number>;
    }>;
    canCreateReview(masterId: string, clientId: string): Promise<{
        canCreate: boolean;
        alreadyReviewed: boolean;
        noClosedLead?: undefined;
    } | {
        canCreate: boolean;
        noClosedLead: boolean;
        alreadyReviewed?: undefined;
    } | {
        canCreate: boolean;
        alreadyReviewed?: undefined;
        noClosedLead?: undefined;
    }>;
}
