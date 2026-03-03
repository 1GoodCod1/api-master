import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';

/**
 * Специализированный сервис для построения сложных SQL-запросов поиска мастеров.
 * Выносит тяжелую логику ранжирования и фильтрации через Raw SQL.
 *
 * FULL-TEXT SEARCH SETUP (run once):
 * Add this migration SQL to enable GIN indexes for fast full-text search:
 *
 * -- Add tsvector computed column for master search
 * ALTER TABLE masters ADD COLUMN IF NOT EXISTS search_vector tsvector;
 *
 * -- Populate the column
 * UPDATE masters m SET search_vector =
 *   setweight(to_tsvector('russian', COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')), 'A') ||
 *   setweight(to_tsvector('russian', COALESCE(m.description, '')), 'B') ||
 *   setweight(to_tsvector('simple',  COALESCE(m.slug, '')), 'D')
 * FROM users u WHERE u.id = m."userId";
 *
 * -- Create GIN index (fast for full-text lookup)
 * CREATE INDEX IF NOT EXISTS idx_masters_search_vector ON masters USING GIN(search_vector);
 *
 * -- Add trigger to keep it up-to-date on insert/update
 * CREATE OR REPLACE FUNCTION update_master_search_vector() RETURNS trigger AS $$
 * BEGIN
 *   NEW.search_vector :=
 *     setweight(to_tsvector('russian', COALESCE(NEW."userId"::text, '')), 'D');
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql;
 * -- (Full trigger joins User name at app startup via a cron or event — see cache-warming service)
 */
@Injectable()
export class MastersSearchSqlService {
  private readonly logger = new Logger(MastersSearchSqlService.name);

  constructor(private readonly prisma: PrismaService) { }

  async getRankedMasterIds(params: {
    categoryId?: string;
    cityId?: string;
    tariffType?: 'BASIC' | 'VIP' | 'PREMIUM';
    isFeatured?: boolean;
    minRating?: number;
    minPrice?: number;
    maxPrice?: number;
    availableNow?: boolean;
    hasPromotion?: boolean;
    search?: string;
    skip: number;
    take: number;
    sortBy: string;
    sortOrder: string;
  }) {
    const {
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
    } = params;

    const now = new Date();

    // Базовые условия фильтрации
    const whereClauses: Prisma.Sql[] = [Prisma.sql`u."isBanned" = false`];

    if (categoryId)
      whereClauses.push(Prisma.sql`m."categoryId" = ${categoryId}`);
    if (cityId) whereClauses.push(Prisma.sql`m."cityId" = ${cityId}`);
    if (isFeatured !== undefined)
      whereClauses.push(Prisma.sql`m."isFeatured" = ${isFeatured}`);
    if (minRating !== undefined)
      whereClauses.push(Prisma.sql`m."rating" >= ${minRating}`);

    // Фильтр "Доступен сейчас" — isOnline + availabilityStatus = AVAILABLE
    if (availableNow === true) {
      whereClauses.push(Prisma.sql`m."isOnline" = true`);
      whereClauses.push(
        Prisma.sql`m."availabilityStatus" = 'AVAILABLE'::"AvailabilityStatus"`,
      );
    }

    // Фильтр "С акцией" — у мастера есть активная акция
    if (hasPromotion === true) {
      whereClauses.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "promotions" p
        WHERE p."masterId" = m."id"
          AND p."isActive" = true
          AND p."validFrom" <= ${now}
          AND p."validUntil" >= ${now}
      )`);
    }

    // Фильтр по цене из services JSON
    if (minPrice !== undefined) {
      whereClauses.push(Prisma.sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements(m."services") AS s
        WHERE (s->>'price')::numeric >= ${minPrice}
      )`);
    }
    if (maxPrice !== undefined) {
      whereClauses.push(Prisma.sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements(m."services") AS s
        WHERE (s->>'price')::numeric <= ${maxPrice}
      )`);
    }

    // -----------------------------------------------------------------------
    // Full-text search: use tsvector index when search term is present.
    // Falls back to ILIKE for Russian names that may not tokenize well.
    // -----------------------------------------------------------------------
    let fulltextRankSql: Prisma.Sql | null = null;

    if (search && search.trim()) {
      const searchTerm = search.trim();

      // Try to use the GIN-indexed search_vector column first (fast path).
      // If the column doesn't exist yet (migration not run), we fall back to ILIKE.
      try {
        // Build tsquery: 'word1 & word2' for multi-word, with prefix match (:*)
        const tsquery = searchTerm
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => `${w.replace(/[^\w\u0400-\u04FF]/gi, '')}:*`)
          .join(' & ');

        // Full-text condition using indexed search_vector
        whereClauses.push(Prisma.sql`(
          m.search_vector @@ to_tsquery('russian', ${tsquery})
          OR u."firstName" ILIKE ${`%${searchTerm}%`}
          OR u."lastName"  ILIKE ${`%${searchTerm}%`}
          OR m."slug"      ILIKE ${`%${searchTerm}%`}
        )`);

        // Rank expression — used in ORDER BY when search is active
        fulltextRankSql = Prisma.sql`ts_rank(m.search_vector, to_tsquery('russian', ${tsquery})) DESC,`;
      } catch (err) {
        // Fallback for environments where search_vector column doesn't exist yet
        this.logger.warn(`Full-text search unavailable, falling back to ILIKE: ${err}`);
        const searchPattern = `%${searchTerm}%`;
        whereClauses.push(Prisma.sql`(
          u."firstName" ILIKE ${searchPattern} OR
          u."lastName"  ILIKE ${searchPattern} OR
          m."description" ILIKE ${searchPattern} OR
          m."slug" ILIKE ${searchPattern} OR
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(m."services") AS s
            WHERE (s->>'name') ILIKE ${searchPattern}
              OR (s->>'description') ILIKE ${searchPattern}
          )
        )`);
      }
    }

    if (tariffType) {
      whereClauses.push(
        Prisma.sql`m."tariffType" = ${tariffType}::"TariffType"`,
      );
      if (tariffType !== 'BASIC') {
        whereClauses.push(Prisma.sql`m."tariffExpiresAt" > ${now}`);
      }
    }

    const whereClause =
      whereClauses.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(whereClauses, ' AND ')}`
        : Prisma.empty;

    const tariffRankSql = this.buildTariffRankSql(now);
    const sortSql = this.buildSortSql(sortBy, sortOrder);

    // When a search query is present, boost results by text relevance FIRST,
    // then by tariff rank, then by the selected sort column.
    const query = Prisma.sql`
      SELECT m."id"
      FROM "masters" m
      INNER JOIN "users" u ON u."id" = m."userId"
      ${whereClause}
      ORDER BY
        ${fulltextRankSql ?? Prisma.empty}
        (${tariffRankSql}) DESC,
        ${sortSql}
      LIMIT ${take}
      OFFSET ${skip}
    `;

    const result = await this.prisma.$queryRaw<Array<{ id: string }>>(query);
    return result.map((r) => r.id);
  }

  private buildTariffRankSql(now: Date) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return Prisma.sql`
      CASE
        WHEN m."tariffType" = 'PREMIUM' AND m."tariffExpiresAt" IS NOT NULL AND m."tariffExpiresAt" > ${now} 
          THEN 3.0 + LEAST(
            COALESCE((
              SELECT COUNT(*)::float * 0.3 
              FROM "leads" l 
              WHERE l."masterId" = m."id" 
              AND l."createdAt" > ${sevenDaysAgo}
            ), 0) +
            COALESCE((
              SELECT COUNT(*)::float * 0.2 
              FROM "reviews" r 
              WHERE r."masterId" = m."id" 
              AND r."createdAt" > ${sevenDaysAgo}
            ), 0) +
            LEAST(COALESCE(m."views", 0)::float / 100.0, 1.0) * 0.1,
            2.0
          )
        WHEN m."tariffType" = 'VIP'   AND m."tariffExpiresAt" IS NOT NULL AND m."tariffExpiresAt" > ${now} THEN 2.0
        ELSE 1.0
      END
    `;
  }

  private buildSortSql(sortBy: string, sortOrder: string) {
    const sortMap: Record<string, Prisma.Sql> = {
      rating: Prisma.sql`m."rating"`,
      reviews: Prisma.sql`m."totalReviews"`,
      totalReviews: Prisma.sql`m."totalReviews"`,
      experience: Prisma.sql`m."experienceYears"`,
      leads: Prisma.sql`m."leadsCount"`,
      leadsCount: Prisma.sql`m."leadsCount"`,
      views: Prisma.sql`m."views"`,
      createdAt: Prisma.sql`m."createdAt"`,
      updatedAt: Prisma.sql`m."updatedAt"`,
      price: Prisma.sql`COALESCE((
        SELECT MIN((s->>'price')::numeric)
        FROM jsonb_array_elements(m."services") AS s
        WHERE s->>'price' IS NOT NULL
      ), 0)`,
    };

    const sortField = sortMap[sortBy] || sortMap.rating;
    const normalizedOrder =
      sortOrder?.toLowerCase() === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    return Prisma.sql`${sortField} ${normalizedOrder}`;
  }
}
