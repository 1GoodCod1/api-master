import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { Category } from '@prisma/client';
import { CategoriesQueryService } from './categories-query.service';
import {
  CrudCacheableEntityActionService,
  CrudCacheableEntityConfig,
} from '../../../shared/services/crud-cacheable-entity-action.service';

function buildCategoriesConfig(
  prisma: PrismaService,
  cache: CacheService,
  queryService: CategoriesQueryService,
): CrudCacheableEntityConfig<Category, CreateCategoryDto, UpdateCategoryDto> {
  return {
    entityName: CategoriesActionService.name,
    entityNameSingular: 'category',
    entityNameAccusative: 'category',
    getEntityCacheKey: (id) => cache.keys.categoryWithStats(id),
    invalidateGlobalCaches: async () => {
      await Promise.all([
        cache.invalidateWithLeafKey(
          cache.keys.categoriesAll(),
          cache.patterns.categoriesAll(),
        ),
        cache.invalidate(cache.patterns.categoriesStatistics()),
        cache.invalidate(cache.patterns.searchMasters()),
      ]);
    },
    createEntity: (dto) => prisma.category.create({ data: dto }),
    updateEntity: (id, dto) =>
      prisma.category.update({ where: { id }, data: dto }),
    findWithMastersCount: (id) =>
      prisma.category.findUnique({
        where: { id },
        include: { _count: { select: { masters: true } } },
      }),
    deleteEntity: (id) => prisma.category.delete({ where: { id } }),
    findOneForToggle: async (id) => {
      const category = await queryService.findOne(id);
      return { isActive: category.isActive };
    },
    ensureExists: (id) => queryService.findOne(id).then(() => {}),
  };
}

@Injectable()
export class CategoriesActionService extends CrudCacheableEntityActionService<
  Category,
  CreateCategoryDto,
  UpdateCategoryDto
> {
  constructor(
    prisma: PrismaService,
    cache: CacheService,
    queryService: CategoriesQueryService,
  ) {
    super(cache, buildCategoriesConfig(prisma, cache, queryService));
  }
}
