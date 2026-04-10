import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export interface PaginationQueryOptions {
  page?: boolean;
  cursor?: boolean;
}

/**
 * Applies standard pagination `@ApiQuery` decorators.
 *
 * Defaults: page + limit + cursor.
 * - `@ApiPaginationQueries()` — page, limit, cursor
 * - `@ApiPaginationQueries({ cursor: false })` — page, limit
 * - `@ApiPaginationQueries({ page: false, cursor: false })` — limit only
 */
export function ApiPaginationQueries(
  opts: PaginationQueryOptions = {},
): MethodDecorator & ClassDecorator {
  const { page = true, cursor = true } = opts;
  const decorators: (MethodDecorator & ClassDecorator)[] = [];

  if (page) {
    decorators.push(ApiQuery({ name: 'page', required: false, type: Number }));
  }

  decorators.push(ApiQuery({ name: 'limit', required: false, type: Number }));

  if (cursor) {
    decorators.push(
      ApiQuery({ name: 'cursor', required: false, type: String }),
    );
  }

  return applyDecorators(...decorators);
}
