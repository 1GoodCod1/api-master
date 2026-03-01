import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import {
  validateSlug,
  validateId,
} from '../../modules/shared/utils/slug-validator.util';

/**
 * Pipe для валидации slug параметров из URL
 * Защищает от XSS и Path Traversal атак
 *
 * @example
 * @Get(':slug')
 * async getMaster(@Param('slug', ValidateSlugPipe) slug: string) {
 *   // slug гарантированно безопасен
 * }
 */
@Injectable()
export class ValidateSlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const sanitized = validateSlug(value);

    if (!sanitized) {
      throw new BadRequestException('Invalid slug format');
    }

    return sanitized;
  }
}

/**
 * Pipe для валидации ID параметров из URL
 * Поддерживает UUID, CUID и числовые ID
 *
 * @example
 * @Get(':id')
 * async getUser(@Param('id', ValidateIdPipe) id: string) {
 *   // id гарантированно безопасен
 * }
 */
@Injectable()
export class ValidateIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!validateId(value)) {
      throw new BadRequestException('Invalid ID format');
    }

    return value;
  }
}

/**
 * Универсальный Pipe для валидации параметров
 * Автоматически определяет тип (slug или id)
 *
 * @example
 * @Get(':param')
 * async get(@Param('param', ValidateParamPipe) param: string) {
 *   // param проверен и безопасен
 * }
 */
@Injectable()
export class ValidateParamPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    // Сначала пробуем как ID
    if (validateId(value)) {
      return value;
    }

    // Затем как slug
    const sanitizedSlug = validateSlug(value);
    if (sanitizedSlug) {
      return sanitizedSlug;
    }

    throw new BadRequestException('Invalid parameter format');
  }
}
