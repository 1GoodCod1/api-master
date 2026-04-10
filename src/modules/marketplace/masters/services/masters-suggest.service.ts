import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { SuggestQueryDto } from '../dto/suggest-query.dto';

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s,
  );
}

@Injectable()
export class MastersSuggestService {
  private readonly logger = new Logger(MastersSuggestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private async withFuzzyFallback<T>(
    label: string,
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
  ): Promise<T> {
    try {
      return await primary();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('word_similarity') || msg.includes('pg_trgm')) {
        this.logger.warn(`${label} fuzzy failed, using ILIKE fallback: ${msg}`);
        return fallback();
      }
      throw err;
    }
  }

  private async resolveCitySlugId(
    slug: string | undefined,
  ): Promise<string | undefined> {
    if (!slug) return undefined;
    if (isUuid(slug)) return slug;
    const row = await this.prisma.city.findFirst({
      where: { slug: { equals: slug, mode: 'insensitive' }, isActive: true },
      select: { id: true },
    });
    return row?.id;
  }

  /**
   * Умные подсказки при вводе: категории, услуги, мастера.
   * Использует fuzzy matching (pg_trgm word_similarity) для толерантности к опечаткам.
   */
  async getSuggestions(dto: SuggestQueryDto) {
    const { q, limit = 8, cityId: rawCityId } = dto;
    const searchTerm = q.trim();
    if (!searchTerm || searchTerm.length < 1) {
      return { categories: [], masters: [], services: [] };
    }

    const cityId = await this.resolveCitySlugId(rawCityId);
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
    return this.withFuzzyFallback(
      'suggestCategories',
      () => this.prisma.$queryRaw<Row[]>`
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
      `,
      () => this.prisma.$queryRaw<Row[]>`
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
      `,
    );
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

    return this.withFuzzyFallback(
      'suggestMasters',
      () => this.prisma.$queryRaw<Row[]>`
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
      `,
      () => this.prisma.$queryRaw<Row[]>`
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
      `,
    );
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
    return this.withFuzzyFallback(
      'suggestServices',
      () => this.prisma.$queryRaw<Row[]>`
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
      `,
      () => this.prisma.$queryRaw<Row[]>`
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
      `,
    );
  }
}
