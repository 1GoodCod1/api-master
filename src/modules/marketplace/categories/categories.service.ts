import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Category } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesQueryService } from './services/categories-query.service';
import { CategoriesActionService } from './services/categories-action.service';

/**
 * Координатор модуля категорий.
 * Делегирует запросы в CategoriesQueryService и мутации в CategoriesActionService.
 */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly queryService: CategoriesQueryService,
    private readonly actionService: CategoriesActionService,
  ) {}

  findAllFromQuery(isActive?: string) {
    return this.queryService.findAllFromQuery(isActive);
  }

  findAll(filters: Prisma.CategoryWhereInput = {}) {
    return this.queryService.findAll(filters);
  }

  findOne(id: string) {
    return this.queryService.findOne(id);
  }

  getMastersFromQuery(
    categoryId: string,
    page?: string,
    limit?: string,
    cursor?: string,
  ) {
    return this.queryService.getMastersFromQuery(
      categoryId,
      page,
      limit,
      cursor,
    );
  }

  getMasters(
    categoryId: string,
    options: { page?: number; limit?: number; cursor?: string } = {},
  ) {
    return this.queryService.getMasters(categoryId, options);
  }

  getStatistics() {
    return this.queryService.getStatistics();
  }

  create(dto: CreateCategoryDto): Promise<Category> {
    return this.actionService.create(dto);
  }

  update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    return this.actionService.update(id, dto);
  }

  remove(id: string): Promise<Category> {
    return this.actionService.remove(id);
  }

  toggleActive(id: string, isActive?: boolean): Promise<Category> {
    return this.actionService.toggleActive(id, isActive);
  }
}
