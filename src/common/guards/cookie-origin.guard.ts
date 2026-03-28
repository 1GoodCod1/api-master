import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../errors';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { getCorsOrigins } from '../../config/cors.config';

/**
 * When the browser sends the httpOnly refresh cookie, require `Origin` or `Referer`
 * to match configured CORS origins. Mitigates cross-site cookie misuse (CSRF-style).
 * Skips: non-cookie auth, safe methods, or when checks are disabled in config.
 */
@Injectable()
export class CookieOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.config.get<boolean>('security.cookieOriginCheckEnabled')) {
      return true;
    }
    if (!this.config.get<boolean>('auth.useHttpOnlyCookie')) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    const cookieName =
      this.config.get<string>('auth.refreshCookieName') || 'rt';
    const hasRefreshCookie = Boolean(req.cookies?.[cookieName]);
    if (!hasRefreshCookie) {
      return true;
    }

    const origin =
      (typeof req.headers.origin === 'string' && req.headers.origin) ||
      this.refererToOrigin(req.headers.referer);

    const allowed = this.allowedOrigins();
    if (!origin || !allowed.has(origin)) {
      throw AppErrors.forbidden(AppErrorMessages.GUARD_INVALID_ORIGIN);
    }

    return true;
  }

  private refererToOrigin(referer: string | undefined): string | undefined {
    if (!referer || typeof referer !== 'string') {
      return undefined;
    }
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }

  private allowedOrigins(): Set<string> {
    const raw = getCorsOrigins();
    const list = Array.isArray(raw) ? raw : [raw];
    return new Set(list.map((o) => o.replace(/\/$/, '')));
  }
}
