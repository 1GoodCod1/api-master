import { Prisma } from '@prisma/client';

export type PrismaPaymentAggregate = {
  _sum: {
    amount: Prisma.Decimal | null;
  };
};

export type PrismaMasterAnalytics = {
  id: string;
  masterId: string;
  date: Date;
  leadsCount: number;
  viewsCount: number;
  reviewsCount: number;
  rating: Prisma.Decimal;
  revenue: Prisma.Decimal;
  createdAt: Date;
};

export type PrismaSystemAnalytics = {
  id: string;
  date: Date;
  totalUsers: number;
  totalMasters: number;
  totalLeads: number;
  totalReviews: number;
  totalRevenue: Prisma.Decimal;
  activeUsers: number;
  cpuUsage: number;
  memoryUsage: number;
  redisKeys: number;
  createdAt: Date;
};
