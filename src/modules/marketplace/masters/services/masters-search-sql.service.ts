import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {}

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
    /** Use pg_trgm fuzzy search for typo tolerance. Fallback to exact if extension unavailable. */
    useFuzzy?: boolean;
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
      useFuzzy = true,
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

    // Фильтр по цене из services JSON.
    // Мастера без услуг (services = null/[]) включаются — иначе они исчезают из поиска.
    // Regex для безопасного cast, чтобы не падать на "100 MDL" и т.п.
    if (minPrice !== undefined) {
      whereClauses.push(Prisma.sql`(
        COALESCE(m."services", '[]'::jsonb) = '[]'::jsonb
        OR jsonb_array_length(COALESCE(m."services", '[]'::jsonb)) = 0
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(m."services", '[]'::jsonb)) AS s
          WHERE (s->>'price') IS NOT NULL AND (s->>'price') ~ '^[0-9.]+$' AND (s->>'price')::numeric >= ${minPrice}
        )
      )`);
    }
    if (maxPrice !== undefined) {
      whereClauses.push(Prisma.sql`(
        COALESCE(m."services", '[]'::jsonb) = '[]'::jsonb
        OR jsonb_array_length(COALESCE(m."services", '[]'::jsonb)) = 0
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(m."services", '[]'::jsonb)) AS s
          WHERE (s->>'price') IS NOT NULL AND (s->>'price') ~ '^[0-9.]+$' AND (s->>'price')::numeric <= ${maxPrice}
        )
      )`);
    }

    // -----------------------------------------------------------------------
    // Full-text search: use tsvector index when search term is present.
    // Falls back to ILIKE for Russian names that may not tokenize well.
    // -----------------------------------------------------------------------
    let fulltextRankSql: Prisma.Sql | null = null;

    if (search?.trim()) {
      const searchTerm = search.trim();
      const searchPattern = `%${searchTerm}%`;
      const words = searchTerm.split(/\s+/).filter((w) => w.length >= 2);

      const buildSearchCondition = (useFuzzy: boolean) => {
        const exactConditions = Prisma.sql`(
          u."firstName" ILIKE ${searchPattern} OR
          u."lastName"  ILIKE ${searchPattern} OR
          m."description" ILIKE ${searchPattern} OR
          m."slug" ILIKE ${searchPattern} OR
          c."name" ILIKE ${searchPattern} OR
          c."description" ILIKE ${searchPattern} OR
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(m."services", '[]'::jsonb)) AS s
            WHERE (s->>'title') ILIKE ${searchPattern}
              OR (s->>'name') ILIKE ${searchPattern}
              OR (s->>'description') ILIKE ${searchPattern}
          )
        )`;

        if (!useFuzzy || words.length === 0) {
          return exactConditions;
        }

        const fuzzyParts: Prisma.Sql[] = [];
        for (const word of words) {
          const w = word.replace(/[^\w\u0400-\u04FF]/gi, '');
          if (w.length < 2) continue;
          fuzzyParts.push(Prisma.sql`(
            word_similarity(${w}, COALESCE(u."firstName", '')) > 0.2 OR
            word_similarity(${w}, COALESCE(u."lastName", '')) > 0.2 OR
            word_similarity(${w}, COALESCE(m."description", '')) > 0.2 OR
            word_similarity(${w}, COALESCE(m."slug", '')) > 0.2 OR
            word_similarity(${w}, COALESCE(c."name", '')) > 0.2 OR
            word_similarity(${w}, COALESCE(c."description", '')) > 0.2 OR
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(COALESCE(m."services", '[]'::jsonb)) AS s
              WHERE word_similarity(${w}, COALESCE(s->>'title', '')) > 0.2
                OR word_similarity(${w}, COALESCE(s->>'name', '')) > 0.2
                OR word_similarity(${w}, COALESCE(s->>'description', '')) > 0.2
            )
          )`);
        }

        return fuzzyParts.length > 0
          ? Prisma.sql`(${exactConditions} OR ${Prisma.join(fuzzyParts, ' OR ')})`
          : exactConditions;
      };

      try {
        const tsquery = searchTerm
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => `${w.replace(/[^\w\u0400-\u04FF]/gi, '')}:*`)
          .join(' & ');

        whereClauses.push(Prisma.sql`(
          m.search_vector @@ to_tsquery('russian', ${tsquery})
          OR ${buildSearchCondition(useFuzzy)}
        )`);

        fulltextRankSql = Prisma.sql`ts_rank(m.search_vector, to_tsquery('russian', ${tsquery})) DESC,`;
      } catch (err) {
        this.logger.warn(
          `Full-text search unavailable, falling back to ILIKE+fuzzy: ${err}`,
        );
        whereClauses.push(buildSearchCondition(useFuzzy));
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
      SELECT m."id", COUNT(*) OVER() as "totalCount"
      FROM "masters" m
      INNER JOIN "users" u ON u."id" = m."userId"
      LEFT JOIN "categories" c ON c."id" = m."categoryId"
      ${whereClause}
      ORDER BY
        ${fulltextRankSql ?? Prisma.empty}
        (${tariffRankSql}) DESC,
        ${sortSql}
      LIMIT ${take}
      OFFSET ${skip}
    `;

    const result =
      await this.prisma.$queryRaw<
        Array<{ id: string; totalCount: string | number | bigint }>
      >(query);

    if (result.length === 0) {
      return { ids: [], total: 0 };
    }

    return {
      ids: result.map((r) => r.id),
      total: Number(result[0].totalCount),
    };
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
      createdAt: Prisma.sql`m."createdAt"`,
      price: Prisma.sql`COALESCE((
        SELECT MIN((s->>'price')::numeric)
        FROM jsonb_array_elements(m."services") AS s
        WHERE s->>'price' IS NOT NULL AND (s->>'price') ~ '^[0-9.]+$'
      ), 0)`,
    };

    const sortField = sortMap[sortBy] || sortMap.rating;
    const normalizedOrder =
      sortOrder?.toLowerCase() === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    return Prisma.sql`${sortField} ${normalizedOrder}`;
  }
}
