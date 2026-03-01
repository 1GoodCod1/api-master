import { PrismaService } from '../../shared/database/prisma.service';
import { MasterAnalyticsResponse, AdvancedAnalyticsResponse } from '../../shared/types/analytics.types';
export declare class AnalyticsMasterService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMasterAnalytics(masterId: string, days?: number): Promise<MasterAnalyticsResponse>;
    getAdvancedMasterAnalytics(masterId: string, days?: number): Promise<AdvancedAnalyticsResponse>;
    private fillMissingDates;
    private calculateSummary;
    private calculateConversion;
    private calculateTrends;
    private calculateComparison;
    private getMasterPosition;
    private calculateForecast;
    private getPeakHours;
    private getTopSources;
    private getActivityHeatmap;
    private generateInsights;
}
