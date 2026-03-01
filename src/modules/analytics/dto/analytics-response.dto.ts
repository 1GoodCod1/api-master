import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsSummaryDto {
  @ApiProperty()
  totalLeads: number;

  @ApiProperty()
  totalViews: number;

  @ApiProperty()
  totalReviews: number;

  @ApiProperty()
  avgRating: number;

  @ApiProperty()
  totalRevenue: number;
}

export class DailyAnalyticsItemDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  leadsCount: number;

  @ApiProperty()
  viewsCount: number;

  @ApiProperty()
  reviewsCount: number;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  revenue: number;
}

export class MasterAnalyticsResponseDto {
  @ApiProperty()
  period: string;

  @ApiProperty({ type: [DailyAnalyticsItemDto] })
  data: DailyAnalyticsItemDto[];

  @ApiProperty({ type: AnalyticsSummaryDto })
  summary: AnalyticsSummaryDto;
}
