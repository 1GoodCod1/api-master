import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
export declare class LeadsAnalyticsService {
    private readonly prisma;
    private readonly cache;
    constructor(prisma: PrismaService, cache: CacheService);
    handlePostCreation(masterId: string): Promise<void>;
    private updateDailyAnalytics;
}
