import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReviewStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  SORT_ASC,
  SORT_DESC,
} from '../../../shared/constants/sort-order.constants';
import { CacheService } from '../../../shared/cache/cache.service';
import { Cacheable } from '../../../shared/cache/cacheable.decorator';
import { City } from '@prisma/client';

export type CityWithMastersCount = City & {
  _count: { masters: number };
};

@Injectable()
export class CitiesQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Получение городов по сырым query-параметрам (для контроллера).
   */
  findAllFromQuery(isActive?: string): Promise<City[]> {
    const filters: Prisma.CityWhereInput = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    return this.findAll(filters);
  }

  /**
   * Получение списка всех городов с поддержкой фильтрации.
   */
  @Cacheable(
    (filters: Prisma.CityWhereInput) =>
      `cache:cities:all:${JSON.stringify(filters ?? {})}`,
    7200,
  )
  async findAll(filters: Prisma.CityWhereInput = {}): Promise<City[]> {
    return this.prisma.city.findMany({
      where: filters,
      orderBy: { name: SORT_ASC },
    });
  }

  /**
   * Поиск города по ID со статистикой мастеров.
   */
  @Cacheable((id: string) => `cache:city:${id}:with-stats`, 7200)
  async findOne(id: string): Promise<CityWithMastersCount> {
    const found = await this.prisma.city.findUnique({
      where: { id },
      include: {
        _count: { select: { masters: true } },
      },
    });

    if (!found) {
      throw new NotFoundException(`City with ID "${id}" not found`);
    }

    return found;
  }

  /**
   * Получение активных и верифицированных мастеров в городе.
   */
  async getMasters(cityId: string) {
    const [city, masters] = await Promise.all([
      this.findOne(cityId),
      this.prisma.master.findMany({
        where: {
          cityId,
          user: { isBanned: false, isVerified: true },
        },
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
        orderBy: { rating: SORT_DESC },
        take: 50,
      }),
    ]);

    return {
      city,
      masters,
      total: masters.length,
    };
  }

  /**
   * Статистика по городам для админ-панели.
   */
  async getStatistics() {
    const cities = await this.prisma.city.findMany({
      include: {
        _count: { select: { masters: true } },
        masters: {
          select: { rating: true, leadsCount: true },
        },
      },
      orderBy: {
        masters: { _count: SORT_DESC },
      },
    });

    return cities.map((city) => ({
      id: city.id,
      name: city.name,
      mastersCount: city._count.masters,
      isActive: city.isActive,
      avgRating: this.calculateAverageRating(city.masters),
      totalLeads: city.masters.reduce((sum, m) => sum + m.leadsCount, 0),
    }));
  }

  private calculateAverageRating(masters: { rating: number }[]): number {
    if (masters.length === 0) return 0;
    const total = masters.reduce((sum, m) => sum + m.rating, 0);
    return Math.round((total / masters.length) * 10) / 10;
  }
}
