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
 * Adds Cache-Control headers for public GET endpoints to enable browser/CDN caching.
 * - Categories, cities: 1h (rarely change)
 * - Masters search, popular, new, landing-stats, filters, profile, promotions: 5min
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

      // Categories and cities: 1h
      if (path === '/categories' || path === '/cities') {
        response.setHeader(
          'Cache-Control',
          'public, max-age=3600, stale-while-revalidate=60',
        );
      }
      // Masters public endpoints, promotions active: 5min
      else if (
        path === '/masters' ||
        path === '/masters/filters' ||
        path === '/masters/popular' ||
        path === '/masters/new' ||
        path === '/masters/landing-stats' ||
        path === '/promotions/active'
      ) {
        response.setHeader(
          'Cache-Control',
          'public, max-age=300, stale-while-revalidate=60',
        );
      }
      // Master profile by slug (e.g. /masters/john-doe), master photos
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
