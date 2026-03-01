import { PrismaService } from '../../shared/database/prisma.service';
import { BusinessAnalyticsResponse } from '../../shared/types/analytics.types';
export declare class AnalyticsBusinessService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getBusinessAnalytics(days?: number): Promise<BusinessAnalyticsResponse>;
    private getDailyStats;
    private getCategoryStats;
    private getCityStats;
}
