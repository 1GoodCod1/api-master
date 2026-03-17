import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { CreateCityDto } from '../dto/create-city.dto';
import { UpdateCityDto } from '../dto/update-city.dto';
import { City } from '@prisma/client';
import { CitiesQueryService } from './cities-query.service';

@Injectable()
export class CitiesActionService {
  private readonly logger = new Logger(CitiesActionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly queryService: CitiesQueryService,
  ) {}

  /**
   * Создание нового города.
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
    await this.queryService.findOne(id);

    const updated = await this.prisma.city.update({
      where: { id },
      data: dto,
    });

    await this.invalidateCityCache(id);
    await this.invalidateGlobalCaches();

    return updated;
  }

  /**
   * Удаление города (только если в нём нет мастеров).
   */
  async remove(id: string): Promise<City> {
    const city = await this.prisma.city.findUnique({
      where: { id },
      include: { _count: { select: { masters: true } } },
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
   * Переключение активности города.
   * Если isActive передан — устанавливает значение; иначе инвертирует текущее.
   */
  async toggleActive(id: string, isActive?: boolean): Promise<City> {
    if (typeof isActive === 'boolean') {
      return this.update(id, { isActive });
    }
    const current = await this.queryService.findOne(id);
    return this.update(id, { isActive: !current.isActive });
  }

  private async invalidateCityCache(id: string): Promise<void> {
    await this.cache.del(this.cache.keys.cityWithStats(id));
  }

  private async invalidateGlobalCaches(): Promise<void> {
    await Promise.all([
      this.cache.invalidateWithLeafKey(
        this.cache.keys.citiesAll(),
        this.cache.patterns.citiesAll(),
      ),
      this.cache.invalidate(this.cache.patterns.searchMasters()),
    ]);
  }
}
