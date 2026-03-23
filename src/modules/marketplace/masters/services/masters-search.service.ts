import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReviewStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { SearchMastersDto } from '../dto/search-masters.dto';
import { SuggestQueryDto } from '../dto/suggest-query.dto';
import {
  sanitizePublicMaster,
  getEffectiveTariff,
} from '../../../../common/helpers/plans';
import { resolvePublicMasterAvatarPath } from '../../../../common/helpers/master-public-avatar';

import { MastersSearchSqlService } from './masters-search-sql.service';

@Injectable()
export class MastersSearchService {
  private readonly logger = new Logger(MastersSearchService.name);

  /** Минимум заявок для блока «популярные» + видимый отзыв с ответом мастера */
  private static readonly MIN_LEADS_FOR_POPULAR_MASTERS = 15;
  /** Средний рейтинг (по видимым отзывам, поле master.rating) */
  private static readonly MIN_RATING_FOR_POPULAR_MASTERS = 4.3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly sqlService: MastersSearchSqlService,
  ) {}

  private static isUuid(s: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      s,
    );
  }

  async findAll(searchDto: SearchMastersDto) {
    const {
      categoryId: rawCategoryId,
      cityId: rawCityId,
      tariffType,
      isFeatured,
      minRating,
      minPrice,
      maxPrice,
      availableNow,
      hasPromotion,
      search,
      cursor,
      page = 1,
      limit = 20,
      sortBy = 'rating',
      sortOrder = 'desc',
    } = searchDto;

    // Резолв slug → id (как при регистрации), чтобы фронт мог слать slug в URL
    let categoryId: string | undefined = rawCategoryId;
    let cityId: string | undefined = rawCityId;
    if (rawCategoryId && !MastersSearchService.isUuid(rawCategoryId)) {
      const cat = await this.prisma.category.findFirst({
        where: {
          slug: { equals: rawCategoryId, mode: 'insensitive' },
          isActive: true,
        },
        select: { id: true },
      });
      categoryId = cat?.id;
    }
    if (rawCityId && !MastersSearchService.isUuid(rawCityId)) {
      const city = await this.prisma.city.findFirst({
        where: {
          slug: { equals: rawCityId, mode: 'insensitive' },
          isActive: true,
        },
        select: { id: true },
      });
      cityId = city?.id;
    }

    const take = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip =
      cursor !== undefined && cursor !== null
        ? Math.max(0, Number(cursor) || 0)
        : (Math.max(1, Number(page) || 1) - 1) * take;
    const effectivePage = Math.floor(skip / Math.max(1, take)) + 1;

    // Строим ключ кеша (cursor приводим к page для совместимости)
    const cacheKey = this.cache.keys.searchMasters({
      categoryId: categoryId || null,
      cityId: cityId || null,
      page: effectivePage,
      limit: take,
      sortBy,
      sortOrder,
      search: search || null,
      tariffType: tariffType || null,
      minRating: minRating || null,
      isFeatured: isFeatured ?? null,
      minPrice: minPrice ?? null,
      maxPrice: maxPrice ?? null,
      availableNow: availableNow ?? null,
      hasPromotion: hasPromotion ?? null,
    });

    // Пытаемся получить из кеша
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();

        // Prisma where для total
        const where: Prisma.MasterWhereInput = {
          user: { isBanned: false },
        };
        if (categoryId) where.categoryId = categoryId;
        if (cityId) where.cityId = cityId;
        if (isFeatured !== undefined) where.isFeatured = isFeatured;
        if (minRating !== undefined) where.rating = { gte: Number(minRating) };
        if (availableNow === true) {
          where.isOnline = true;
          where.availabilityStatus = 'AVAILABLE';
        }
        if (hasPromotion === true) {
          where.promotions = {
            some: {
              isActive: true,
              validFrom: { lte: now },
              validUntil: { gte: now },
            },
          };
        }

        // Поиск по имени, описанию, категории (умный поиск)
        if (search?.trim()) {
          const searchTerm = search.trim();
          where.OR = [
            {
              user: {
                firstName: { contains: searchTerm, mode: 'insensitive' },
              },
            },
            {
              user: {
                lastName: { contains: searchTerm, mode: 'insensitive' },
              },
            },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { slug: { contains: searchTerm, mode: 'insensitive' } },
            {
              category: { name: { contains: searchTerm, mode: 'insensitive' } },
            },
            {
              category: {
                description: { contains: searchTerm, mode: 'insensitive' },
              },
            },
          ];
        }

        if (tariffType) {
          where.tariffType = tariffType;
          if (tariffType !== 'BASIC') where.tariffExpiresAt = { gt: now };
        }

        // ✅ Используем специализированный SQL сервис для ранжирования И подсчета (уменьшает время в 2 раза при промахе кеша)
        let ids: string[];
        let total: number;
        try {
          const res = await this.sqlService.getRankedMasterIds({
            categoryId,
            cityId,
            tariffType,
            isFeatured,
            minRating,
            minPrice,
            maxPrice,
            availableNow,
            hasPromotion,
            search,
            skip,
            take,
            sortBy,
            sortOrder,
            useFuzzy: true,
          });
          ids = res.ids;
          total = res.total;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (
            search &&
            (msg.includes('word_similarity') || msg.includes('pg_trgm'))
          ) {
            this.logger.warn(
              `pg_trgm unavailable, falling back to exact search: ${msg}`,
            );
            const fallbackRes = await this.sqlService.getRankedMasterIds({
              categoryId,
              cityId,
              tariffType,
              isFeatured,
              minRating,
              minPrice,
              maxPrice,
              availableNow,
              hasPromotion,
              search,
              skip,
              take,
              sortBy,
              sortOrder,
              useFuzzy: false,
            });
            ids = fallbackRes.ids;
            total = fallbackRes.total;
          } else {
            throw err;
          }
        }

        if (!ids.length) {
          return {
            items: [],
            meta: {
              total,
              page,
              limit: take,
              totalPages: Math.ceil(total / take),
            },
          };
        }

        const masters = await this.prisma.master.findMany({
          where: { id: { in: ids } },
          include: {
            avatarFile: true,
            category: true,
            city: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                isVerified: true,
                avatarFile: { select: { path: true } },
              },
            },
            _count: {
              select: { reviews: { where: { status: ReviewStatus.VISIBLE } } },
            },
          },
        });

        const byId = new Map(masters.map((m) => [m.id, m]));
        const ordered = ids
          .map((id) => byId.get(id))
          .filter((m): m is NonNullable<typeof m> => m != null);

        const nextCursor = skip + take < total ? skip + take : null;

        return {
          items: ordered.map((master) => {
            const sanitized = sanitizePublicMaster(master);
            const eff = getEffectiveTariff(sanitized);
            return {
              ...sanitized,
              effectiveTariffType: eff,
              tariffType: eff,
              avatarUrl: resolvePublicMasterAvatarPath(master),
              latitude: master.latitude ?? null,
              longitude: master.longitude ?? null,
              services: master.services ?? null,
            };
          }),
          meta: {
            total,
            page: effectivePage,
            limit: take,
            totalPages: Math.ceil(total / take),
            nextCursor,
          },
        };
      },
      this.cache.ttl.search, // 5 минут
    );
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
            include: {
              _count: {
                select: { masters: true },
              },
            },
            orderBy: { sortOrder: 'asc' },
          }),
          this.prisma.city.findMany({
            where: { isActive: true },
            include: {
              _count: {
                select: { masters: true },
              },
            },
            orderBy: { name: 'asc' },
          }),
          this.prisma.master.groupBy({
            by: ['tariffType'],
            _count: true,
            where: {
              user: {
                isBanned: false,
                isVerified: true,
              },
            },
          }),
          this.prisma.master.aggregate({
            where: {
              user: {
                isBanned: false,
                isVerified: true,
              },
            },
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
          experienceRange: {
            min: 0,
            max: 50,
          },
          priceRange: {
            min: Math.max(0, Math.floor(priceRange.min)),
            max: Math.max(100, Math.ceil(priceRange.max)),
          },
          availableNowCount,
          hasPromotionCount,
        };
      },
      this.cache.ttl.searchFilters, // 1 hour
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
                gte: MastersSearchService.MIN_RATING_FOR_POPULAR_MASTERS,
              },
              leadsCount: {
                gte: MastersSearchService.MIN_LEADS_FOR_POPULAR_MASTERS,
              },
              reviews: {
                some: {
                  status: ReviewStatus.VISIBLE,
                  replies: { some: {} },
                },
              },
            },
            orderBy: [
              { isFeatured: 'desc' },
              { leadsCount: 'desc' },
              { rating: 'desc' },
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
            where: {
              user: {
                isBanned: false,
              },
            },
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
            orderBy: { createdAt: 'desc' },
            take: limit,
          });

          return masters.map((m) => {
            const sanitized = sanitizePublicMaster(m);
            return {
              ...sanitized,
              avatarUrl: resolvePublicMasterAvatarPath(m),
            };
          });
        },
        this.cache.ttl.newMasters, // 5 minutes
      );
    } catch (error) {
      this.logger.warn(
        `getNewMasters failed, returning []: ${error instanceof Error ? error.message : error}`,
      );
      return [];
    }
  }

  /**
   * Умные подсказки при вводе: категории, услуги, мастера.
   * Использует fuzzy matching (pg_trgm word_similarity) для толерантности к опечаткам,
   * а также ILIKE для точных совпадений. Возвращает сгруппированные результаты.
   */
  async getSuggestions(dto: SuggestQueryDto) {
    const { q, limit = 8, cityId: rawCityId } = dto;
    const searchTerm = q.trim();
    if (!searchTerm || searchTerm.length < 1) {
      return { categories: [], masters: [], services: [] };
    }

    let cityId: string | undefined = rawCityId;
    if (rawCityId && !MastersSearchService.isUuid(rawCityId)) {
      const city = await this.prisma.city.findFirst({
        where: {
          slug: { equals: rawCityId, mode: 'insensitive' },
          isActive: true,
        },
        select: { id: true },
      });
      cityId = city?.id;
    }

    const cacheKey = this.cache.keys.searchSuggest(searchTerm, cityId ?? null);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const pattern = `%${searchTerm}%`;
        const maxPerGroup = Math.min(limit, 10);

        const [categories, masters, services] = await Promise.all([
          this.suggestCategories(searchTerm, pattern, maxPerGroup),
          this.suggestMasters(searchTerm, pattern, maxPerGroup, cityId),
          this.suggestServices(searchTerm, pattern, maxPerGroup),
        ]);

        return {
          categories: categories.map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            icon: c.icon,
            count: Number(c.count),
          })),
          masters: masters.map((m) => ({
            id: m.id,
            slug: m.slug,
            name: `${m.firstName} ${m.lastName}`.trim(),
            categoryName: m.categoryName,
            cityName: m.cityName,
            avatarPath: m.avatarPath,
            rating: Number(m.rating),
          })),
          services: services
            .filter((s) => s.title)
            .map((s) => ({
              title: s.title,
              categorySlug: s.categorySlug,
              categoryName: s.categoryName,
              masterCount: Number(s.masterCount),
            })),
        };
      },
      60, // 1 minute cache for suggestions
    );
  }

  private async suggestCategories(
    searchTerm: string,
    pattern: string,
    limit: number,
  ) {
    type Row = {
      id: string;
      slug: string;
      name: string;
      icon: string | null;
      count: number;
    };
    try {
      return await this.prisma.$queryRaw<Row[]>`
        SELECT
          c."id",
          c."slug",
          c."name",
          c."icon",
          (SELECT COUNT(*)::int FROM "masters" m
           INNER JOIN "users" u ON u."id" = m."userId" AND u."isBanned" = false
           WHERE m."categoryId" = c."id") AS "count"
        FROM "categories" c
        WHERE c."isActive" = true
          AND (
            c."name" ILIKE ${pattern}
            OR c."description" ILIKE ${pattern}
            OR word_similarity(${searchTerm}, COALESCE(c."name", '')) > 0.25
            OR word_similarity(${searchTerm}, COALESCE(c."description", '')) > 0.2
          )
        ORDER BY
          CASE WHEN c."name" ILIKE ${pattern} THEN 0 ELSE 1 END,
          word_similarity(${searchTerm}, COALESCE(c."name", '')) DESC,
          c."sortOrder" ASC
        LIMIT ${limit}
      `;
    } catch (err) {
      this.logger.warn(`Suggest categories fuzzy failed, using ILIKE: ${err}`);
      return this.prisma.$queryRaw<Row[]>`
        SELECT
          c."id",
          c."slug",
          c."name",
          c."icon",
          (SELECT COUNT(*)::int FROM "masters" m
           INNER JOIN "users" u ON u."id" = m."userId" AND u."isBanned" = false
           WHERE m."categoryId" = c."id") AS "count"
        FROM "categories" c
        WHERE c."isActive" = true
          AND (c."name" ILIKE ${pattern} OR c."description" ILIKE ${pattern})
        ORDER BY c."sortOrder" ASC
        LIMIT ${limit}
      `;
    }
  }

  private async suggestMasters(
    searchTerm: string,
    pattern: string,
    limit: number,
    cityId?: string,
  ) {
    type Row = {
      id: string;
      slug: string;
      firstName: string;
      lastName: string;
      categoryName: string | null;
      cityName: string | null;
      avatarPath: string | null;
      rating: number;
    };
    const cityFilter = cityId
      ? Prisma.sql`AND m."cityId" = ${cityId}`
      : Prisma.empty;

    try {
      return await this.prisma.$queryRaw<Row[]>`
        SELECT
          m."id",
          m."slug",
          u."firstName",
          u."lastName",
          c."name" AS "categoryName",
          ct."name" AS "cityName",
          COALESCE(af."path", uf."path") AS "avatarPath",
          m."rating"
        FROM "masters" m
        INNER JOIN "users" u ON u."id" = m."userId" AND u."isBanned" = false
        LEFT JOIN "categories" c ON c."id" = m."categoryId"
        LEFT JOIN "cities" ct ON ct."id" = m."cityId"
        LEFT JOIN "files" af ON af."id" = m."avatarFileId"
        LEFT JOIN "files" uf ON uf."id" = u."avatarFileId"
        WHERE (
          u."firstName" ILIKE ${pattern}
          OR u."lastName" ILIKE ${pattern}
          OR m."slug" ILIKE ${pattern}
          OR (u."firstName" || ' ' || u."lastName") ILIKE ${pattern}
          OR word_similarity(${searchTerm}, COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')) > 0.3
          OR word_similarity(${searchTerm}, COALESCE(m."slug", '')) > 0.3
        )
        ${cityFilter}
        ORDER BY
          CASE WHEN (u."firstName" || ' ' || u."lastName") ILIKE ${pattern} THEN 0 ELSE 1 END,
          m."rating" DESC,
          m."isFeatured" DESC
        LIMIT ${limit}
      `;
    } catch (err) {
      this.logger.warn(`Suggest masters fuzzy failed, using ILIKE: ${err}`);
      return this.prisma.$queryRaw<Row[]>`
        SELECT
          m."id",
          m."slug",
          u."firstName",
          u."lastName",
          c."name" AS "categoryName",
          ct."name" AS "cityName",
          COALESCE(af."path", uf."path") AS "avatarPath",
          m."rating"
        FROM "masters" m
        INNER JOIN "users" u ON u."id" = m."userId" AND u."isBanned" = false
        LEFT JOIN "categories" c ON c."id" = m."categoryId"
        LEFT JOIN "cities" ct ON ct."id" = m."cityId"
        LEFT JOIN "files" af ON af."id" = m."avatarFileId"
        LEFT JOIN "files" uf ON uf."id" = u."avatarFileId"
        WHERE (
          u."firstName" ILIKE ${pattern}
          OR u."lastName" ILIKE ${pattern}
          OR m."slug" ILIKE ${pattern}
          OR (u."firstName" || ' ' || u."lastName") ILIKE ${pattern}
        )
        ${cityFilter}
        ORDER BY m."rating" DESC, m."isFeatured" DESC
        LIMIT ${limit}
      `;
    }
  }

  private async suggestServices(
    searchTerm: string,
    pattern: string,
    limit: number,
  ) {
    type Row = {
      title: string;
      categorySlug: string | null;
      categoryName: string | null;
      masterCount: number;
    };
    try {
      return await this.prisma.$queryRaw<Row[]>`
        WITH svc AS (
          SELECT DISTINCT ON (LOWER(COALESCE(s->>'title', s->>'name')))
            COALESCE(s->>'title', s->>'name') AS "title",
            c."slug" AS "categorySlug",
            c."name" AS "categoryName"
          FROM "masters" m
          INNER JOIN "users" u ON u."id" = m."userId" AND u."isBanned" = false
          LEFT JOIN "categories" c ON c."id" = m."categoryId"
          CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m."services", '[]'::jsonb)) AS s
          WHERE (
            (s->>'title') ILIKE ${pattern}
            OR (s->>'name') ILIKE ${pattern}
            OR word_similarity(${searchTerm}, COALESCE(s->>'title', s->>'name', '')) > 0.3
          )
          ORDER BY LOWER(COALESCE(s->>'title', s->>'name')), m."rating" DESC
        )
        SELECT
          svc."title",
          svc."categorySlug",
          svc."categoryName",
          (SELECT COUNT(DISTINCT m2."id")::int
           FROM "masters" m2
           INNER JOIN "users" u2 ON u2."id" = m2."userId" AND u2."isBanned" = false
           CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m2."services", '[]'::jsonb)) AS s2
           WHERE LOWER(COALESCE(s2->>'title', s2->>'name')) = LOWER(svc."title")
          ) AS "masterCount"
        FROM svc
        ORDER BY "masterCount" DESC
        LIMIT ${limit}
      `;
    } catch (err) {
      this.logger.warn(`Suggest services fuzzy failed, using ILIKE: ${err}`);
      return this.prisma.$queryRaw<Row[]>`
        WITH svc AS (
          SELECT DISTINCT ON (LOWER(COALESCE(s->>'title', s->>'name')))
            COALESCE(s->>'title', s->>'name') AS "title",
            c."slug" AS "categorySlug",
            c."name" AS "categoryName"
          FROM "masters" m
          INNER JOIN "users" u ON u."id" = m."userId" AND u."isBanned" = false
          LEFT JOIN "categories" c ON c."id" = m."categoryId"
          CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m."services", '[]'::jsonb)) AS s
          WHERE (s->>'title') ILIKE ${pattern} OR (s->>'name') ILIKE ${pattern}
          ORDER BY LOWER(COALESCE(s->>'title', s->>'name')), m."rating" DESC
        )
        SELECT
          svc."title",
          svc."categorySlug",
          svc."categoryName",
          1 AS "masterCount"
        FROM svc
        LIMIT ${limit}
      `;
    }
  }
}
