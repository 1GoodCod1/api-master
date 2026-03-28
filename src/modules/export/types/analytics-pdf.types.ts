export interface AnalyticsPdfData {
  masterName: string;
  categoryName: string;
  cityName: string;
  rating: number | null;
  totalReviews: number;
  totalLeads: number;
  leadsStats: Array<{ status: string; _count: number }>;
  reviewsStats: Array<{ status: string; _count: number }>;
  bookingsStats: Array<{ status: string; _count: number }>;
  analytics: Array<{
    date: Date;
    leadsCount: number;
    viewsCount: number;
  }>;
}
