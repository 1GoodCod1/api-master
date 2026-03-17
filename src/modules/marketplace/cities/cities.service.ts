import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { City } from '@prisma/client';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { CitiesQueryService } from './services/cities-query.service';
import { CitiesActionService } from './services/cities-action.service';

/**
 * Координатор модуля городов.
 * Делегирует запросы в CitiesQueryService и мутации в CitiesActionService.
 */
@Injectable()
export class CitiesService {
  constructor(
    private readonly queryService: CitiesQueryService,
    private readonly actionService: CitiesActionService,
  ) {}

  findAllFromQuery(isActive?: string) {
    return this.queryService.findAllFromQuery(isActive);
  }

  findAll(filters: Prisma.CityWhereInput = {}) {
    return this.queryService.findAll(filters);
  }

  findOne(id: string) {
    return this.queryService.findOne(id);
  }

  getMasters(cityId: string) {
    return this.queryService.getMasters(cityId);
  }

  getStatistics() {
    return this.queryService.getStatistics();
  }

  create(dto: CreateCityDto): Promise<City> {
    return this.actionService.create(dto);
  }

  update(id: string, dto: UpdateCityDto): Promise<City> {
    return this.actionService.update(id, dto);
  }

  remove(id: string): Promise<City> {
    return this.actionService.remove(id);
  }

  toggleActive(id: string, isActive?: boolean): Promise<City> {
    return this.actionService.toggleActive(id, isActive);
  }
}
