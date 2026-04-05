import { RequestMethod, type INestApplication } from '@nestjs/common';

/** Базовый путь публичного API (см. `applyGlobalPrefix`). */
export const API_GLOBAL_PREFIX = 'api/v1';

/**
 * Маршруты, которые остаются в корне приложения (пробы, метрики, статика, Swagger).
 * Пути — пути Nest (без ведущего слеша), кроме `'/'` для корневого обработчика.
 */
export const GLOBAL_PREFIX_EXCLUDE: Array<
  string | { path: string; method: RequestMethod }
> = [
  { path: '/', method: RequestMethod.GET },
  { path: 'health', method: RequestMethod.GET },
  { path: 'ping', method: RequestMethod.GET },
  { path: 'readiness', method: RequestMethod.GET },
  { path: 'liveness', method: RequestMethod.GET },
  { path: 'version', method: RequestMethod.GET },
  { path: 'metrics', method: RequestMethod.GET },
  'docs',
  'docs-json',
  'docs-yaml',
  'favicon.ico',
  'uploads/*path',
];

export function applyGlobalPrefix(app: INestApplication): void {
  app.setGlobalPrefix(API_GLOBAL_PREFIX, {
    exclude: GLOBAL_PREFIX_EXCLUDE,
  });
}
