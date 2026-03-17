import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReviewStatus } from '../../common/constants';
import { PrismaService } from '../shared/database/prisma.service';
import { CacheService } from '../shared/cache/cache.service';
import { Cacheable } from '../shared/cache/cacheable.decorator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from '@prisma/client';
import {
  buildCursorQuery,
  buildPaginatedResponse,
} from '../shared/pagination/cursor-pagination';

/**
 * Сервис управления категориями услуг.
 * Обрабатывает бизнес-логику, кеширование и аналитику по категориям.
 */
@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Получение всех категорий с учетом фильтров.
   * Считает только верифицированных и не забаненных мастеров (как в getMasters).
   * Результаты кешируются для снижения нагрузки на БД.
   */
  @Cacheable(
    (filters: Prisma.CategoryWhereInput) =>
      `cache:categories:all:${JSON.stringify(filters ?? {})}`,
    3600,
  )
  async findAll(filters: Prisma.CategoryWhereInput = {}): Promise<Category[]> {
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
        c."isActive", c."sortOrder", c."createdAt", c."updatedAt"
      ORDER BY c."sortOrder" ASC
    `;

    return rows.map((row) => {
      const { mastersCount, ...cat } = row;
      return {
        ...cat,
        _count: { masters: mastersCount },
      } as Category & { _count: { masters: number } };
    });
  }

  /**
   * Поиск одной категории по ID.
   * Включает статистику количества мастеров и использует кеш.
   */
  @Cacheable((id: string) => `cache:category:${id}:with-stats`, 3600)
  async findOne(
    id: string,
  ): Promise<Category & { _count: { masters: number } }> {
    const found = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { masters: true },
        },
      },
    });

    if (!found) {
      throw new NotFoundException(`Категория с ID "${id}" не найдена`);
    }

    return found;
  }

  /**
   * Получение активных мастеров в конкретной категории с cursor-based пагинацией.
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
      user: {
        isBanned: false,
        isVerified: true,
      },
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
   * Создание новой категории с последующей инвалидацией кеша.
   */
  async create(dto: CreateCategoryDto): Promise<Category> {
    try {
      const category = await this.prisma.category.create({
        data: dto,
      });

      await this.invalidateGlobalCaches();
      return category;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ошибка при создании категории: ${message}`);
      throw error;
    }
  }

  /**
   * Обновление данных существующей категории.
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    // Проверяем существование перед обновлением
    await this.findOne(id);

    const updated = await this.prisma.category.update({
      where: { id },
      data: dto,
    });

    await this.invalidateCategoryCache(id);
    await this.invalidateGlobalCaches();

    return updated;
  }

  /**
   * Удаление категории (только если в ней нет мастеров).
   */
  async remove(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { masters: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Категория с ID "${id}" не найдена`);
    }

    if (category._count.masters > 0) {
      throw new BadRequestException(
        'Нельзя удалить категорию, в которой есть активные мастера',
      );
    }

    const deleted = await this.prisma.category.delete({
      where: { id },
    });

    await this.invalidateCategoryCache(id);
    await this.invalidateGlobalCaches();

    return deleted;
  }

  /**
   * Получение расширенной статистики по всем категориям.
   * Оптимизировано: используем агрегации вместо загрузки всех мастеров в память.
   */
  async getStatistics() {
    const cacheKey = this.cache.buildKey(['cache', 'categories', 'statistics']);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Single efficient query instead of loading all masters into memory
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

  // ==================== Вспомогательные методы (Private) ====================

  /**
   * Удаление кеша конкретной категории.
   */
  private async invalidateCategoryCache(id: string) {
    await this.cache.del(this.cache.keys.categoryWithStats(id));
  }

  /**
   * Полная очистка глобальных ключей кеша категорий.
   */
  private async invalidateGlobalCaches() {
    await Promise.all([
      this.cache.invalidateWithLeafKey(
        this.cache.keys.categoriesAll(),
        this.cache.patterns.categoriesAll(),
      ),
      this.cache.invalidate(this.cache.patterns.categoriesStatistics()),
      this.cache.invalidate(this.cache.patterns.searchMasters()),
    ]);
  }
}
