import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { Category } from '@prisma/client';
import { CategoriesQueryService } from './categories-query.service';

@Injectable()
export class CategoriesActionService {
  private readonly logger = new Logger(CategoriesActionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly queryService: CategoriesQueryService,
  ) {}

  /**
   * Создание новой категории.
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
   * Обновление данных категории.
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.queryService.findOne(id);

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
      include: { _count: { select: { masters: true } } },
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
   * Переключение активности категории.
   * Если isActive передан — устанавливает значение; иначе инвертирует текущее.
   */
  async toggleActive(id: string, isActive?: boolean): Promise<Category> {
    if (typeof isActive === 'boolean') {
      return this.update(id, { isActive });
    }
    const current = await this.queryService.findOne(id);
    return this.update(id, { isActive: !current.isActive });
  }

  private async invalidateCategoryCache(id: string): Promise<void> {
    await this.cache.del(this.cache.keys.categoryWithStats(id));
  }

  private async invalidateGlobalCaches(): Promise<void> {
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
