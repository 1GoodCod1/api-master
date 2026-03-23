import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReviewStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { Cacheable } from '../../../shared/cache/cacheable.decorator';
import { Category } from '@prisma/client';
import {
  buildCursorQuery,
  buildPaginatedResponse,
} from '../../../shared/pagination/cursor-pagination';

export type CategoryWithMastersCount = Category & {
  _count: { masters: number };
};

@Injectable()
export class CategoriesQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Получение категорий по сырым query-параметрам (для контроллера).
   */
  findAllFromQuery(isActive?: string): Promise<CategoryWithMastersCount[]> {
    const filters: Prisma.CategoryWhereInput = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    return this.findAll(filters);
  }

  /**
   * Получение всех категорий с учётом фильтров.
   * Считает только верифицированных и не забаненных мастеров.
   */
  @Cacheable(
    (filters: Prisma.CategoryWhereInput) =>
      `cache:categories:all:${JSON.stringify(filters ?? {})}`,
    3600,
  )
  async findAll(
    filters: Prisma.CategoryWhereInput = {},
  ): Promise<CategoryWithMastersCount[]> {
    type Row = Category & { mastersCount: number };
    const whereParts: Prisma.Sql[] = [];
    if (filters.isActive !== undefined) {
      whereParts.push(Prisma.sql`c."isActive" = ${filters.isActive}`);
    }
    const whereClause =
      whereParts.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(whereParts, ' AND ')}`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT
        c."id",
        c."name",
        c."slug",
        c."description",
        c."icon",
        c."iconKey",
        c."iconUrl",
        c."translations",
        c."isActive",
        c."sortOrder",
        c."createdAt",
        c."updatedAt",
        COUNT(m."id") FILTER (
          WHERE u."isBanned" = false AND u."isVerified" = true
        )::int AS "mastersCount"
      FROM "categories" c
      LEFT JOIN "masters" m ON m."categoryId" = c."id"
      LEFT JOIN "users" u ON u."id" = m."userId"
      ${whereClause}
      GROUP BY c."id", c."name", c."slug", c."description", c."icon",
        c."iconKey", c."iconUrl", c."translations",
        c."isActive", c."sortOrder", c."createdAt", c."updatedAt"
      ORDER BY c."sortOrder" ASC
    `;

    return rows.map((row) => {
      const { mastersCount, ...cat } = row;
      return {
        ...cat,
        _count: { masters: mastersCount },
      } as CategoryWithMastersCount;
    });
  }

  /**
   * Поиск категории по ID со статистикой мастеров.
   */
  @Cacheable((id: string) => `cache:category:${id}:with-stats`, 3600)
  async findOne(id: string): Promise<CategoryWithMastersCount> {
    const found = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { masters: true } },
      },
    });

    if (!found) {
      throw new NotFoundException(`Категория с ID "${id}" не найдена`);
    }

    return found;
  }

  /**
   * Получение мастеров по сырым query-параметрам (для контроллера).
   */
  getMastersFromQuery(
    categoryId: string,
    page?: string,
    limit?: string,
    cursor?: string,
  ) {
    const parsedPage = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const parsedLimit = limit
      ? Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
      : 20;
    return this.getMasters(categoryId, {
      page: parsedPage,
      limit: parsedLimit,
      cursor,
    });
  }

  /**
   * Получение активных мастеров в категории с cursor-based пагинацией.
   */
  async getMasters(
    categoryId: string,
    options: {
      page?: number;
      limit?: number;
      cursor?: string;
    } = {},
  ) {
    const { page = 1, limit: rawLimit = 20, cursor } = options;
    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));

    const baseWhere: Prisma.MasterWhereInput = {
      categoryId,
      user: { isBanned: false, isVerified: true },
    };

    const queryParams = buildCursorQuery(
      baseWhere as Record<string, unknown>,
      cursor,
      page,
      limit,
    );

    const [category, rawMasters, total] = await Promise.all([
      this.findOne(categoryId),
      this.prisma.master.findMany({
        where: queryParams.where as Prisma.MasterWhereInput,
        include: {
          category: true,
          city: true,
          _count: {
            select: {
              reviews: {
                where: { status: ReviewStatus.VISIBLE },
              },
            },
          },
        },
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: queryParams.take,
        skip: queryParams.skip,
      }),
      this.prisma.master.count({ where: baseWhere }),
    ]);

    const paginated = buildPaginatedResponse(
      rawMasters as Array<{ id: string; createdAt: Date }>,
      total,
      limit,
      queryParams.usedCursor,
    );

    return {
      category,
      masters: paginated.items,
      meta: paginated.meta,
    };
  }

  /**
   * Расширенная статистика по всем категориям.
   */
  async getStatistics() {
    const cacheKey = this.cache.buildKey(['cache', 'categories', 'statistics']);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        type CategoryStatRow = {
          categoryId: string;
          name: string;
          isActive: boolean;
          mastersCount: bigint;
          avgRating: number | null;
          totalLeads: bigint;
        };

        const stats = await this.prisma.$queryRaw<CategoryStatRow[]>`
          SELECT
            c."id" AS "categoryId",
            c."name",
            c."isActive",
            COUNT(m."id")::bigint AS "mastersCount",
            ROUND(AVG(m."rating")::numeric, 1)::float8 AS "avgRating",
            COALESCE(SUM(m."leadsCount"), 0)::bigint AS "totalLeads"
          FROM "categories" c
          LEFT JOIN "masters" m ON m."categoryId" = c."id"
          GROUP BY c."id", c."name", c."isActive"
          ORDER BY COUNT(m."id") DESC
        `;

        return stats.map((row) => ({
          id: row.categoryId,
          name: row.name,
          mastersCount: Number(row.mastersCount),
          isActive: row.isActive,
          avgRating: row.avgRating ?? 0,
          totalLeads: Number(row.totalLeads),
        }));
      },
      this.cache.ttl.categories,
    );
  }
}
