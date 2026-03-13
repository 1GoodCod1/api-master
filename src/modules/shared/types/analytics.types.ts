export interface MasterAnalyticsItem {
  date: Date;
  leadsCount: number;
  viewsCount: number;
  reviewsCount: number;
  rating: number;
}

export interface FilledAnalyticsItem {
  date: Date;
  leadsCount: number;
  viewsCount: number;
  reviewsCount: number;
  rating: number;
}

export interface AnalyticsSummary {
  totalLeads: number;
  totalViews: number;
  totalReviews: number;
  avgRating: number;
  masterRating?: number;
  masterTotalReviews?: number;
}

export interface MasterAnalyticsResponse {
  period: string;
  data: Array<{
    date: string;
    leadsCount: number;
    viewsCount: number;
    reviewsCount: number;
    rating: number;
  }>;
  summary: AnalyticsSummary;
}

export interface DailyStat {
  date: string;
  leads: number;
  reviews: number;
}

export interface CategoryStat {
  id: string;
  name: string;
  mastersCount: number;
  avgRating: number;
  totalLeads: number;
}

export interface CityStat {
  id: string;
  name: string;
  mastersCount: number;
  avgRating: number;
  totalLeads: number;
}

export interface BusinessAnalyticsResponse {
  period: string;
  totals: {
    masters: number;
    users: number;
    leads: number;
    reviews: number;
  };
  dailyStats: DailyStat[];
  categoryStats: CategoryStat[];
  cityStats: CityStat[];
}

export interface SystemAnalyticsResponse {
  timestamp: string;
  users: {
    total: number;
    active: number;
  };
  redis: {
    keys: number;
    memory: string;
  };
  queues: Record<
    string,
    {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    }
  >;
  system: {
    cpu: {
      loadavg: number[];
      cores: number;
    };
    memory: {
      total: number;
      used: number;
      free: number;
      usage: string;
    };
    uptime: number;
    platform: string;
  };
}

// Расширенная аналитика для PREMIUM
export interface ConversionMetrics {
  viewsToLeads: number;
  leadsToBookings: number;
  bookingsToReviews: number;
  avgResponseTime: number;
}

export interface TrendAnalysis {
  leadsTrend: 'up' | 'down' | 'stable';
  viewsTrend: 'up' | 'down' | 'stable';
  leadsChangePercent: number;
  viewsChangePercent: number;
}

export interface ComparisonData {
  categoryAvg: {
    avgLeads: number;
    avgViews: number;
    avgRating: number;
    mastersCount: number;
  };
  cityAvg: {
    avgLeads: number;
    avgViews: number;
    avgRating: number;
    mastersCount: number;
  };
  position: {
    inCategory: number;
    inCity: number;
  };
}

export interface ForecastData {
  nextWeekLeads: number;
  nextWeekViews: number;
  confidence: number; // 0-100%
}

export interface AdvancedAnalyticsResponse extends MasterAnalyticsResponse {
  bookingsCount?: number;
  conversion: ConversionMetrics;
  trends: TrendAnalysis;
  comparison: ComparisonData;
  forecast: ForecastData;
  peakHours: Array<{
    hour: number;
    leadsCount: number;
    viewsCount: number;
  }>;
  heatmap: Array<{
    dayOfWeek: number;
    hour: number;
    intensity: number;
  }>;
  topSources: Array<{
    source: string;
    leads: number;
    views: number;
  }>;
  insights: Array<{ key: string; params?: Record<string, number | string> }>;
}
