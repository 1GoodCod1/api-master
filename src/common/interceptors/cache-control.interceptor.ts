import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { stripApiPrefix } from '../utils/api-route.util';

/**
 * Cache-Control для публичных GET.
 * - development: без долгого HTTP-кеша (удобнее отладка, согласовано с фронтом)
 * - production: короткий max-age для каталогов и фильтров, дольше — для поиска/профиля
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<{
      setHeader: (name: string, value: string) => void;
    }>();

    if (request.method === 'GET') {
      const path = stripApiPrefix(request.path);
      const isProd = process.env.NODE_ENV === 'production';

      // Categories and cities
      if (path === '/categories' || path === '/cities') {
        if (isProd) {
          response.setHeader(
            'Cache-Control',
            'public, max-age=120, stale-while-revalidate=300',
          );
        } else {
          response.setHeader(
            'Cache-Control',
            'private, no-cache, must-revalidate',
          );
        }
      }
      // Popular masters (aligns with Redis popularMasters)
      else if (path === '/masters/popular') {
        if (isProd) {
          response.setHeader(
            'Cache-Control',
            'public, max-age=120, stale-while-revalidate=30',
          );
        } else {
          response.setHeader(
            'Cache-Control',
            'private, no-cache, must-revalidate',
          );
        }
      }
      // Masters filters — часто меняются при правках категорий/городов
      else if (path === '/masters/filters') {
        if (isProd) {
          response.setHeader(
            'Cache-Control',
            'public, max-age=60, stale-while-revalidate=120',
          );
        } else {
          response.setHeader(
            'Cache-Control',
            'private, no-cache, must-revalidate',
          );
        }
      }
      // Masters search, new, landing-stats, promotions active
      else if (
        path === '/masters' ||
        path === '/masters/new' ||
        path === '/masters/landing-stats' ||
        path === '/promotions/active'
      ) {
        response.setHeader(
          'Cache-Control',
          'public, max-age=300, stale-while-revalidate=60',
        );
      }
      // Master profile by slug, master photos
      else if (
        /^\/masters\/[^/]+$/.test(path) ||
        /^\/masters\/[^/]+\/photos$/.test(path)
      ) {
        response.setHeader(
          'Cache-Control',
          'public, max-age=300, stale-while-revalidate=60',
        );
      }
    }

    return next.handle();
  }
}
