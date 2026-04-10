import { Injectable, Logger } from '@nestjs/common';
import { ReviewStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_DESC } from '../../../../common/constants';
import { CacheService } from '../../../shared/cache/cache.service';
import { SearchMastersDto } from '../dto/search-masters.dto';
import {
  sanitizePublicMaster,
  getEffectiveTariff,
} from '../../../../common/helpers/plans';
import { resolvePublicMasterAvatarPath } from '../../../../common/helpers/master-public-avatar';

import { MastersSearchSqlService } from './masters-search-sql.service';

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s,
  );
}

@Injectable()
export class MastersSearchService {
  private readonly logger = new Logger(MastersSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly sqlService: MastersSearchSqlService,
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

  private async resolveSlugId(
    entity: 'category' | 'city',
    slug: string | undefined,
  ): Promise<string | undefined> {
    if (!slug) return undefined;
    if (isUuid(slug)) return slug;
    if (entity === 'category') {
      const row = await this.prisma.category.findFirst({
        where: { slug: { equals: slug, mode: 'insensitive' }, isActive: true },
        select: { id: true },
      });
      return row?.id;
    }
    const row = await this.prisma.city.findFirst({
      where: { slug: { equals: slug, mode: 'insensitive' }, isActive: true },
      select: { id: true },
    });
    return row?.id;
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
      sortOrder = SORT_DESC,
    } = searchDto;

    // Резолв slug → id, чтобы фронт мог слать slug в URL
    const [categoryId, cityId] = await Promise.all([
      this.resolveSlugId('category', rawCategoryId),
      this.resolveSlugId('city', rawCityId),
    ]);

    const take = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip =
      cursor !== undefined && cursor !== null
        ? Math.max(0, Number(cursor) || 0)
        : (Math.max(1, Number(page) || 1) - 1) * take;
    const effectivePage = Math.floor(skip / Math.max(1, take)) + 1;

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

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const searchParams = {
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
        };
        const { ids, total } = await this.withFuzzyFallback(
          'findAll',
          () =>
            this.sqlService.getRankedMasterIds({
              ...searchParams,
              useFuzzy: true,
            }),
          () =>
            this.sqlService.getRankedMasterIds({
              ...searchParams,
              useFuzzy: false,
            }),
        );

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
      this.cache.ttl.search,
    );
  }
}
