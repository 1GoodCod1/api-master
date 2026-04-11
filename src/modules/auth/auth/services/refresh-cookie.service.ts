import { Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { CompleteOAuthDto } from '../dto/complete-oauth.dto';

const OAUTH_STATE_COOKIE = 'oauth_state';

@Injectable()
export class RefreshCookieService {
  constructor(private readonly configService: ConfigService) {}

  get isEnabled(): boolean {
    return !!this.configService.get<boolean>('auth.useHttpOnlyCookie');
  }

  private get cookieName(): string {
    return this.configService.get<string>('auth.refreshCookieName') || 'rt';
  }

  /** Общие опции для httpOnly auth-кук (refresh, oauth_state, oauth_pending). */
  private authCookieEnv(): {
    setBase: {
      httpOnly: true;
      secure: boolean;
      sameSite: 'lax';
      path: '/';
      domain?: string;
    };
    clearBase: {
      path: '/';
      httpOnly: true;
      secure: boolean;
      sameSite: 'lax';
      domain?: string;
    };
  } {
    const isProd = this.configService.get<string>('nodeEnv') === 'production';
    const domain =
      this.configService.get<string>('auth.cookieDomain') || undefined;
    const withDomain = domain ? { domain } : {};
    return {
      setBase: {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        ...withDomain,
      },
      clearBase: {
        path: '/',
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        ...withDomain,
      },
    };
  }

  /**
   * Возвращает refresh-токен или выбрасывает, если токена нет.
   */
  getTokenOrThrow(req: Request, bodyToken?: string): string {
    const token = this.getToken(req, bodyToken);
    if (!token) {
      throw AppErrors.unauthorized(
        AppErrorMessages.AUTH_REFRESH_TOKEN_REQUIRED,
      );
    }
    return token;
  }

  /**
   * Возвращает refresh-токен из куки (если режим httpOnly) или из переданного body.
   */
  getToken(req: Request, bodyToken?: string): string | undefined {
    const fromBody = bodyToken?.trim();
    if (fromBody) return fromBody;
    if (this.isEnabled && req.cookies?.[this.cookieName]) {
      const value = req.cookies[this.cookieName] as string | undefined;
      return typeof value === 'string' ? value : undefined;
    }
    return undefined;
  }

  private static readonly REMEMBER_ME_DAYS = 30;

  /**
   * Устанавливает refresh-куку в ответ, если режим httpOnly включён.
   * Если rememberMe=false — ставится сессионная кука (без maxAge/expires),
   * которая умирает при закрытии браузера.
   */
  attachIfEnabled(res: Response, token: string, rememberMe?: boolean): void {
    if (!this.isEnabled || !token) return;
    const { setBase } = this.authCookieEnv();

    if (rememberMe) {
      const maxAgeMs =
        RefreshCookieService.REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000;
      res.cookie(this.cookieName, token, {
        ...setBase,
        maxAge: maxAgeMs,
        expires: new Date(Date.now() + maxAgeMs),
      });
    } else {
      res.cookie(this.cookieName, token, setBase);
    }
  }

  /**
   * Удаляет refresh-куку из ответа, если режим httpOnly включён.
   */
  clearIfEnabled(res: Response): void {
    if (!this.isEnabled) return;
    const { clearBase } = this.authCookieEnv();
    res.clearCookie(this.cookieName, clearBase);
  }

  setOAuthStateCookie(res: Response, state: string): void {
    const { setBase } = this.authCookieEnv();
    res.cookie(OAUTH_STATE_COOKIE, state, {
      ...setBase,
      maxAge: 30 * 60 * 1000,
    });
  }

  clearOAuthStateCookie(res: Response): void {
    const { clearBase } = this.authCookieEnv();
    res.clearCookie(OAUTH_STATE_COOKIE, clearBase);
  }

  attachOAuthPendingToken(res: Response, token: string): void {
    if (!token || res.headersSent) return;
    const { setBase } = this.authCookieEnv();
    const name =
      this.configService.get<string>('auth.oauthPendingCookieName') ||
      'oauth_pending';
    const maxAge =
      this.configService.get<number>('auth.oauthPendingCookieMaxMs') ??
      15 * 60 * 1000;
    res.cookie(name, token, {
      ...setBase,
      maxAge,
      expires: new Date(Date.now() + maxAge),
    });
  }

  clearOAuthPendingToken(res: Response): void {
    const { clearBase } = this.authCookieEnv();
    const name =
      this.configService.get<string>('auth.oauthPendingCookieName') ||
      'oauth_pending';
    res.clearCookie(name, clearBase);
  }

  mergeCompleteOAuthDto(req: Request, dto: CompleteOAuthDto): CompleteOAuthDto {
    const pendingName =
      this.configService.get<string>('auth.oauthPendingCookieName') ||
      'oauth_pending';
    const cookieJar = req.cookies as Record<string, unknown> | undefined;
    const rawPending = cookieJar?.[pendingName];
    const fromCookie = typeof rawPending === 'string' ? rawPending.trim() : '';
    const fromBody = dto.pendingToken?.trim() ?? '';
    const pendingToken = fromBody || fromCookie;
    return { ...dto, pendingToken };
  }

  /**
   * Убирает refreshToken из тела ответа и возвращает остальное (для httpOnly, чтобы не слать токен в JSON).
   */
  stripRefreshFromPayload<T extends { refreshToken?: string }>(
    payload: T,
  ): Omit<T, 'refreshToken'> {
    if (!this.isEnabled || !payload.refreshToken) return payload;
    const { refreshToken: _rt, ...rest } = payload;
    void _rt;
    return rest;
  }

  /**
   * Устанавливает refresh-куку (если включено) и возвращает payload без внутренних полей.
   */
  handleAuthSuccess<T extends { refreshToken?: string; rememberMe?: boolean }>(
    result: T,
    res: Response,
  ): Omit<T, 'refreshToken' | 'rememberMe'> {
    this.attachIfEnabled(res, result.refreshToken ?? '', result.rememberMe);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { rememberMe: _rm, ...withoutRememberMe } = result;
    return this.stripRefreshFromPayload(withoutRememberMe) as Omit<
      T,
      'refreshToken' | 'rememberMe'
    >;
  }

  /**
   * Логаут: получает токен, вызывает logoutFn при наличии, очищает куку.
   */
  async handleLogout(
    req: Request,
    res: Response,
    bodyToken: string | undefined,
    logoutFn: (token: string) => Promise<unknown>,
  ): Promise<{ message: string }> {
    const token = this.getToken(req, bodyToken);
    if (token) await logoutFn(token);
    this.clearIfEnabled(res);
    return { message: 'Logged out successfully' };
  }
}
