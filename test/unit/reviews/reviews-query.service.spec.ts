import { ReviewsQueryService } from '../../../src/modules/reviews/services/reviews-query.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { CacheService } from '../../../src/modules/shared/cache/cache.service';

type PrismaReviewsQueryMock = {
  review: { findMany: jest.Mock; count: jest.Mock; groupBy: jest.Mock };
  lead: { count: jest.Mock; findFirst: jest.Mock };
};

describe('ReviewsQueryService', () => {
  const prisma: PrismaReviewsQueryMock = {
    review: { findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
    lead: { count: jest.fn(), findFirst: jest.fn() },
  };

  const cache = {
    getOrSet: jest.fn(),
    buildKey: jest.fn((keys: string[]) => keys.join(':')),
    keys: {
      masterReviews: jest.fn(
        (masterId: string, page: number, limit: number, status?: string) =>
          `cache:master:${masterId}:reviews:${page}:${limit}:${status ?? 'all'}`,
      ),
    },
    ttl: { reviews: 300 },
  } as unknown as jest.Mocked<CacheService>;

  let service: ReviewsQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    cache.getOrSet.mockImplementation(async (_key, fetcher) => fetcher());
    service = new ReviewsQueryService(
      prisma as unknown as PrismaService,
      cache,
    );
  });

  describe('findAllForMaster', () => {
    it('returns paginated reviews', async () => {
      const reviews = [
        { id: 'r1', createdAt: new Date(), masterId: 'm1' },
        { id: 'r2', createdAt: new Date(), masterId: 'm1' },
      ];
      prisma.review.findMany.mockResolvedValue(reviews);
      prisma.review.count.mockResolvedValue(2);

      const result = await service.findAllForMaster('m1', {
        limit: 20,
        page: 1,
      });

      expect(result.items).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.hasMore).toBe(false);
    });
  });

  describe('getStats', () => {
    it('returns stats with status and rating distribution', async () => {
      prisma.review.groupBy
        .mockResolvedValueOnce([{ status: 'VISIBLE', _count: 5 }])
        .mockResolvedValueOnce([
          { rating: 5, _count: 3 },
          { rating: 4, _count: 2 },
        ]);

      const result = await service.getStats('m1');

      expect(result.total).toBe(5);
      expect(result.byStatus).toBeDefined();
      expect(result.ratingDistribution).toBeDefined();
    });
  });

  describe('canCreateReview', () => {
    it('returns canCreate: false when already reviewed', async () => {
      prisma.review.count.mockResolvedValue(1);
      prisma.lead.findFirst.mockResolvedValue({ id: 'l1' });

      const result = await service.canCreateReview('m1', 'c1');

      expect(result.canCreate).toBe(false);
      expect(result.alreadyReviewed).toBe(true);
    });

    it('returns canCreate: false when no closed lead', async () => {
      prisma.review.count.mockResolvedValue(0);
      prisma.lead.findFirst.mockResolvedValue(null);

      const result = await service.canCreateReview('m1', 'c1');

      expect(result.canCreate).toBe(false);
      expect(result.noClosedLead).toBe(true);
    });

    it('returns canCreate: true when eligible', async () => {
      prisma.review.count.mockResolvedValue(0);
      prisma.lead.findFirst.mockResolvedValue({ id: 'l1' });

      const result = await service.canCreateReview('m1', 'c1');

      expect(result.canCreate).toBe(true);
    });
  });
});
