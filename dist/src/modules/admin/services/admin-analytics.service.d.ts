import { PrismaService } from '../../shared/database/prisma.service';
export declare class AdminAnalyticsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAnalytics(timeframe?: 'day' | 'week' | 'month'): Promise<{
        timeframe: "week" | "day" | "month";
        stats: {
            database: {
                totalUsers: number;
                totalMasters: number;
                totalLeads: number;
                totalReviews: number;
                totalPayments: number;
            };
            daily: {
                newUsers: number;
                newLeads: number;
                newReviews: number;
                revenue: number;
            };
        };
        users: {
            date: string;
            count: number;
        }[];
        leads: {
            date: string;
            count: number;
        }[];
        reviews: {
            date: string;
            count: number;
        }[];
        revenue: {
            date: string;
            revenue: number;
        }[];
        categories: ({
            masters: {
                rating: number;
                leadsCount: number;
            }[];
            _count: {
                masters: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            description: string | null;
            icon: string | null;
            isActive: boolean;
            sortOrder: number;
        })[];
        cities: ({
            masters: {
                rating: number;
                leadsCount: number;
            }[];
            _count: {
                masters: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            isActive: boolean;
        })[];
    }>;
    private getDailyStats;
    private getDailyRevenueStats;
    private getCategoryStats;
    private getCityStats;
}
