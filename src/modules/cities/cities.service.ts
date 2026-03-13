import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ReviewStatus } from '../../common/constants';
import { PrismaService } from '../shared/database/prisma.service';
import { CacheService } from '../shared/cache/cache.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { City, Prisma } from '@prisma/client';

/**
 * Сервис для управления городами присутствия.
 * Обеспечивает работу со списком городов, их статистикой и кешированием.
 */
@Injectable()
export class CitiesService {
  private readonly logger = new Logger(CitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Получение списка всех городов с поддержкой фильтрации.
   * Данные кешируются для оптимизации производительности.
   */
  async findAll(filters: Prisma.CityWhereInput = {}): Promise<City[]> {
    const filterKey = JSON.stringify(filters);
    const cacheKey = this.cache.buildKey(['cache', 'cities', 'all', filterKey]);

    return this.cache.getOrSet(
      cacheKey,
      () =>
        this.prisma.city.findMany({
          where: filters,
          orderBy: { name: 'asc' },
        }),
      this.cache.ttl.cities,
    );
  }

  /**
   * Поиск конкретного города по его уникальному ID.
   * Возвращает данные города вместе с количеством зарегистрированных в нем мастеров.
   */
  async findOne(id: string): Promise<City & { _count: { masters: number } }> {
    const cacheKey = this.cache.keys.cityWithStats(id);

    const city = await this.cache.getOrSet(
      cacheKey,
      async () => {
        const found = await this.prisma.city.findUnique({
          where: { id },
          include: {
            _count: {
              select: { masters: true },
            },
          },
        });

        if (!found) {
          throw new NotFoundException(`Город с ID "${id}" не найден`);
        }

        return found;
      },
      this.cache.ttl.cities,
    );

    return city as City & { _count: { masters: number } };
  }

  /**
   * Получение списка активных и верифицированных мастеров в заданном городе.
   */
  async getMasters(cityId: string) {
    const [city, masters] = await Promise.all([
      this.findOne(cityId),
      this.prisma.master.findMany({
        where: {
          cityId,
          user: {
            isBanned: false,
            isVerified: true,
          },
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
        orderBy: { rating: 'desc' },
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
   * Создание нового города и сброс соответствующих ключей кеша.
   */
  async create(dto: CreateCityDto): Promise<City> {
    try {
      const city = await this.prisma.city.create({
        data: dto,
      });

      await this.invalidateGlobalCaches();
      return city;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Не удалось создать город: ${message}`);
      throw error;
    }
  }

  /**
   * Обновление информации о городе.
   */
  async update(id: string, dto: UpdateCityDto): Promise<City> {
    // Проверка на существование перед обновлением
    await this.findOne(id);

    const updated = await this.prisma.city.update({
      where: { id },
      data: dto,
    });

    await this.invalidateCityCache(id);
    await this.invalidateGlobalCaches();

    return updated;
  }

  /**
   * Удаление города. Ограничено, если в городе есть зарегистрированные мастера.
   */
  async remove(id: string): Promise<City> {
    const city = await this.prisma.city.findUnique({
      where: { id },
      include: {
        _count: { select: { masters: true } },
      },
    });

    if (!city) {
      throw new NotFoundException(`Город с ID "${id}" не найден`);
    }

    if (city._count.masters > 0) {
      throw new BadRequestException(
        'Нельзя удалить город, в котором есть активные мастера',
      );
    }

    const deleted = await this.prisma.city.delete({
      where: { id },
    });

    await this.invalidateCityCache(id);
    await this.invalidateGlobalCaches();

    return deleted;
  }

  /**
   * Сбор общей статистики по городам для административной панели.
   */
  async getStatistics() {
    const cities = await this.prisma.city.findMany({
      include: {
        _count: {
          select: { masters: true },
        },
        masters: {
          select: {
            rating: true,
            leadsCount: true,
          },
        },
      },
      orderBy: {
        masters: {
          _count: 'desc',
        },
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

  // ==================== Вспомогательные методы (Private) ====================

  /**
   * Расчет среднего рейтинга мастеров в городе.
   */
  private calculateAverageRating(masters: { rating: number }[]): number {
    if (masters.length === 0) return 0;
    const total = masters.reduce((sum, m) => sum + m.rating, 0);
    return Math.round((total / masters.length) * 10) / 10;
  }

  /**
   * Сброс кеша для конкретного города.
   */
  private async invalidateCityCache(id: string) {
    await this.cache.del(this.cache.keys.cityWithStats(id));
  }

  /**
   * Сброс глобальных списков и результатов поиска.
   */
  private async invalidateGlobalCaches() {
    await Promise.all([
      this.cache.invalidateWithLeafKey(
        this.cache.keys.citiesAll(),
        this.cache.patterns.citiesAll(),
      ),
      this.cache.invalidate(this.cache.patterns.searchMasters()),
    ]);
  }
}
