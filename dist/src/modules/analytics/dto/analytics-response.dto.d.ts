export declare class AnalyticsSummaryDto {
    totalLeads: number;
    totalViews: number;
    totalReviews: number;
    avgRating: number;
    totalRevenue: number;
}
export declare class DailyAnalyticsItemDto {
    date: string;
    leadsCount: number;
    viewsCount: number;
    reviewsCount: number;
    rating: number;
    revenue: number;
}
export declare class MasterAnalyticsResponseDto {
    period: string;
    data: DailyAnalyticsItemDto[];
    summary: AnalyticsSummaryDto;
}
