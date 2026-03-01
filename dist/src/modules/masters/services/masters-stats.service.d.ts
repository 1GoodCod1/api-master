import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
export declare class MastersStatsService {
    private readonly prisma;
    private readonly cache;
    constructor(prisma: PrismaService, cache: CacheService);
    getStats(masterId: string): Promise<{
        leadsToday: number;
        leadsThisWeek: number;
        leadsThisMonth: number;
        viewsToday: number;
        viewsThisWeek: number;
        viewsThisMonth: number;
    }>;
    getViewsHistory(masterId: string, period: 'week' | 'month', limit?: number): Promise<{
        periodStart: string;
        periodEnd: string;
        views: number;
        label: string;
    }[]>;
}
