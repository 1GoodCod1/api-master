import { AnalyticsService } from './analytics.service';
import type { RequestWithUser } from '../../common/decorators/get-user.decorator';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getMasterAnalytics(masterId: string, days: number | undefined, req: RequestWithUser): Promise<import("../shared/types/analytics.types").MasterAnalyticsResponse>;
    getBusinessAnalytics(days?: number): Promise<import("../shared/types/analytics.types").BusinessAnalyticsResponse>;
    getSystemAnalytics(): Promise<import("../shared/types/analytics.types").SystemAnalyticsResponse>;
    getMyAnalytics(days: number | undefined, req: RequestWithUser): Promise<import("../shared/types/analytics.types").MasterAnalyticsResponse | import("../shared/types/analytics.types").AdvancedAnalyticsResponse>;
    getMyAdvancedAnalytics(days: number | undefined, req: RequestWithUser): Promise<import("../shared/types/analytics.types").AdvancedAnalyticsResponse>;
}
