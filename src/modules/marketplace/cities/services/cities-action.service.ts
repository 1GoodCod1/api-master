import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { CreateCityDto } from '../dto/create-city.dto';
import { UpdateCityDto } from '../dto/update-city.dto';
import { City } from '@prisma/client';
import { CitiesQueryService } from './cities-query.service';
import {
  CrudCacheableEntityActionService,
  CrudCacheableEntityConfig,
} from '../../../shared/services/crud-cacheable-entity-action.service';

function buildCitiesConfig(
  prisma: PrismaService,
  cache: CacheService,
  queryService: CitiesQueryService,
): CrudCacheableEntityConfig<City, CreateCityDto, UpdateCityDto> {
  return {
    entityName: CitiesActionService.name,
    entityNameSingular: 'city',
    entityNameAccusative: 'city',
    getEntityCacheKey: (id) => cache.keys.cityWithStats(id),
    invalidateGlobalCaches: async () => {
      await Promise.all([
        cache.invalidateWithLeafKey(
          cache.keys.citiesAll(),
          cache.patterns.citiesAll(),
        ),
        cache.invalidate(cache.patterns.searchMasters()),
      ]);
    },
    createEntity: (dto) => prisma.city.create({ data: dto }),
    updateEntity: (id, dto) => prisma.city.update({ where: { id }, data: dto }),
    findWithMastersCount: (id) =>
      prisma.city.findUnique({
        where: { id },
        include: { _count: { select: { masters: true } } },
      }),
    deleteEntity: (id) => prisma.city.delete({ where: { id } }),
    findOneForToggle: async (id) => {
      const city = await queryService.findOne(id);
      return { isActive: city.isActive };
    },
    ensureExists: (id) => queryService.findOne(id).then(() => {}),
  };
}

@Injectable()
export class CitiesActionService extends CrudCacheableEntityActionService<
  City,
  CreateCityDto,
  UpdateCityDto
> {
  constructor(
    prisma: PrismaService,
    cache: CacheService,
    queryService: CitiesQueryService,
  ) {
    super(cache, buildCitiesConfig(prisma, cache, queryService));
  }
}
