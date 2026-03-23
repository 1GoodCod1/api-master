import { RequestMethod, type INestApplication } from '@nestjs/common';

/** Public API base path (see `applyGlobalPrefix`). */
export const API_GLOBAL_PREFIX = 'api/v1';

/**
 * Routes that must stay at the application root (probes, metrics, static, Swagger).
 * Paths are Nest route paths (no leading slash), except `'/'` for the root handler.
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
  'uploads/(.*)',
];

export function applyGlobalPrefix(app: INestApplication): void {
  app.setGlobalPrefix(API_GLOBAL_PREFIX, {
    exclude: GLOBAL_PREFIX_EXCLUDE,
  });
}
