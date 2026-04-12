import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../constants/pagination.constants';

/**
 * Базовый DTO для query-параметров пагинации.
 * Использовать как `extends` в конкретных list-query DTO,
 * чтобы везде применялся единый верхний предел MAX_PAGE_SIZE.
 *
 * Глобальный ValidationPipe (whitelist + transform) в main.ts сам:
 *  — конвертирует строки query в числа (enableImplicitConversion),
 *  — отклоняет запросы с limit > MAX_PAGE_SIZE (class-validator @Max).
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    default: DEFAULT_PAGE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number = DEFAULT_PAGE_SIZE;
}
