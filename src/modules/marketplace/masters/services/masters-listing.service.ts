import { Injectable, Logger } from '@nestjs/common';
import { ReviewStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_ASC, SORT_DESC } from '../../../../common/constants';
import { CacheService } from '../../../shared/cache/cache.service';
import { sanitizePublicMaster } from '../../../../common/helpers/plans';
import { resolvePublicMasterAvatarPath } from '../../../../common/helpers/master-public-avatar';

@Injectable()
export class MastersListingService {
  private readonly logger = new Logger(MastersListingService.name);

  private static readonly MIN_LEADS_FOR_POPULAR_MASTERS = 15;
  private static readonly MIN_RATING_FOR_POPULAR_MASTERS = 4.3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getPopularMasters(limit: number = 10) {
    const cacheKey = this.cache.keys.popularMasters(limit);
    try {
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          const now = new Date();
          const masters = await this.prisma.master.findMany({
            where: {
              user: { isBanned: false },
              rating: {
                gte: MastersListingService.MIN_RATING_FOR_POPULAR_MASTERS,
              },
              leadsCount: {
                gte: MastersListingService.MIN_LEADS_FOR_POPULAR_MASTERS,
              },
              reviews: {
                some: {
                  status: ReviewStatus.VISIBLE,
                  replies: { some: {} },
                },
              },
            },
            orderBy: [
              { isFeatured: SORT_DESC },
              { leadsCount: SORT_DESC },
              { rating: SORT_DESC },
            ],
            take: limit,
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  isVerified: true,
                  avatarFile: { select: { path: true } },
                },
              },
              avatarFile: true,
              category: true,
              city: true,
              promotions: {
                where: {
                  isActive: true,
                  validFrom: { lte: now },
                  validUntil: { gte: now },
                },
                select: { discount: true },
                take: 1,
              },
              _count: {
                select: {
                  reviews: {
                    where: { status: ReviewStatus.VISIBLE },
                  },
                },
              },
            },
          });

          return masters.map((m) => {
            const sanitized = sanitizePublicMaster(m);
            const activePromotion = m.promotions?.[0] ?? null;
            return {
              ...sanitized,
              avatarUrl: resolvePublicMasterAvatarPath(m),
              activePromotion,
              promotions: undefined,
            };
          });
        },
        this.cache.ttl.popularMasters,
      );
    } catch (error) {
      this.logger.warn(
        `getPopularMasters failed, returning []: ${error instanceof Error ? error.message : error}`,
      );
      return [];
    }
  }

  async getNewMasters(limit: number = 10) {
    const cacheKey = this.cache.keys.newMasters(limit);
    try {
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          const masters = await this.prisma.master.findMany({
            where: { user: { isBanned: false } },
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  isVerified: true,
                  avatarFile: { select: { path: true } },
                },
              },
              avatarFile: true,
              category: true,
              city: true,
            },
            orderBy: { createdAt: SORT_DESC },
            take: limit,
          });

          return masters.map((m) => ({
            ...sanitizePublicMaster(m),
            avatarUrl: resolvePublicMasterAvatarPath(m),
          }));
        },
        this.cache.ttl.newMasters,
      );
    } catch (error) {
      this.logger.warn(
        `getNewMasters failed, returning []: ${error instanceof Error ? error.message : error}`,
      );
      return [];
    }
  }

  async getSearchFilters() {
    const cacheKey = this.cache.keys.searchFilters();

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();
        const [
          categories,
          cities,
          tariffStats,
          ratingStats,
          priceRangeRaw,
          availableNowCount,
          hasPromotionCount,
        ] = await Promise.all([
          this.prisma.category.findMany({
            where: { isActive: true },
            include: { _count: { select: { masters: true } } },
            orderBy: { sortOrder: SORT_ASC },
          }),
          this.prisma.city.findMany({
            where: { isActive: true },
            include: { _count: { select: { masters: true } } },
            orderBy: { name: SORT_ASC },
          }),
          this.prisma.master.groupBy({
            by: ['tariffType'],
            _count: true,
            where: { user: { isBanned: false, isVerified: true } },
          }),
          this.prisma.master.aggregate({
            where: { user: { isBanned: false, isVerified: true } },
            _min: { rating: true },
            _max: { rating: true },
            _avg: { rating: true },
          }),
          this.getPriceRangeFromServices(now),
          this.prisma.master.count({
            where: {
              user: { isBanned: false },
              isOnline: true,
              availabilityStatus: 'AVAILABLE',
            },
          }),
          this.prisma.master.count({
            where: {
              user: { isBanned: false },
              promotions: {
                some: {
                  isActive: true,
                  validFrom: { lte: now },
                  validUntil: { gte: now },
                },
              },
            },
          }),
        ]);

        const priceRange = priceRangeRaw ?? { min: 0, max: 5000 };

        return {
          categories: categories.map((cat) => ({
            id: cat.id,
            slug: cat.slug,
            name: cat.name,
            value: cat.slug,
            count: cat._count.masters,
            icon: cat.icon,
          })),
          cities: cities.map((city) => ({
            id: city.id,
            slug: city.slug,
            name: city.name,
            value: city.slug,
            count: city._count.masters,
          })),
          tariffTypes: tariffStats.map((stat) => ({
            type: stat.tariffType,
            count: stat._count,
          })),
          ratingRange: {
            min: ratingStats._min.rating || 0,
            max: ratingStats._max.rating || 5,
            avg: ratingStats._avg.rating || 0,
          },
          experienceRange: { min: 0, max: 50 },
          priceRange: {
            min: Math.max(0, Math.floor(priceRange.min)),
            max: Math.max(100, Math.ceil(priceRange.max)),
          },
          availableNowCount,
          hasPromotionCount,
        };
      },
      this.cache.ttl.searchFilters,
    );
  }

  /**
   * Минимальная и максимальная цена по всем услугам мастеров с учётом активных скидок.
   */
  private async getPriceRangeFromServices(
    now: Date,
  ): Promise<{ min: number; max: number } | null> {
    try {
      type Row = { min_val: number | null; max_val: number | null };
      const result = await this.prisma.$queryRaw<Row[]>`
        WITH service_prices AS (
          SELECT
            m.id AS "masterId",
            (s->>'price')::numeric AS price,
            (SELECT pr.discount FROM promotions pr
             WHERE pr."masterId" = m.id AND pr."isActive" = true
               AND pr."validFrom" <= ${now}::timestamptz AND pr."validUntil" >= ${now}::timestamptz
             LIMIT 1) AS discount
          FROM masters m
          CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.services, '[]'::jsonb)) AS s
          INNER JOIN users u ON u.id = m."userId" AND u."isBanned" = false
          WHERE s->>'priceType' = 'FIXED' AND (s->>'price') IS NOT NULL AND (s->>'price') ~ '^[0-9.]+$'
        ),
        effective AS (
          SELECT
            CASE WHEN discount IS NOT NULL THEN ROUND(price * (1 - discount / 100.0)) ELSE price END AS eff
          FROM service_prices
        )
        SELECT MIN(eff)::float8 AS min_val, MAX(eff)::float8 AS max_val FROM effective
      `;
      const row = result?.[0];
      if (row?.min_val == null || row.max_val == null) return null;
      return { min: Number(row.min_val), max: Number(row.max_val) };
    } catch (e) {
      this.logger.warn(
        `getPriceRangeFromServices failed: ${e instanceof Error ? e.message : e}`,
      );
      return null;
    }
  }
}
