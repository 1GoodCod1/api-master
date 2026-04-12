import { Logger } from '@nestjs/common';

const logger = new Logger('CorsConfig');

/**
 * Источники CORS и CSP imgSrc при старте приложения.
 * Dev: разрешён localhost. Prod: обязателен FRONTEND_URL.
 */
export function getCorsOrigins(): string | string[] {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const origins = (process.env.FRONTEND_URL || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (origins.length === 0) {
      logger.fatal(
        'FRONTEND_URL is required in production. Set env FRONTEND_URL=https://your-domain.com',
      );
      process.exit(1);
    }
    return origins.length === 1 ? origins[0] : origins;
  }
  const list = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:4173',
  ].filter(Boolean) as string[];
  return list.length
    ? list
    : ['http://localhost:3000', 'http://localhost:4173'];
}

/** CSP imgSrc: только self, data, blob и разрешённые origins приложения (без общего https:). */
export function getCspImgSrc(): string[] {
  const base = ["'self'", 'data:', 'blob:'];
  const isProd = process.env.NODE_ENV === 'production';
  const apiUrl = process.env.API_URL || (isProd ? '' : 'http://localhost:4000');
  const frontendFallback = isProd
    ? ''
    : 'http://localhost:3000,http://localhost:4173';
  const frontendUrls = (process.env.FRONTEND_URL || frontendFallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origins = [apiUrl, ...frontendUrls].filter((u) => u);
  return [...base, ...origins];
}
