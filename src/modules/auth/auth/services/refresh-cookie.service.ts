import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

@Injectable()
export class RefreshCookieService {
  constructor(private readonly configService: ConfigService) {}

  get isEnabled(): boolean {
    return !!this.configService.get<boolean>('auth.useHttpOnlyCookie');
  }

  private get cookieName(): string {
    return this.configService.get<string>('auth.refreshCookieName') || 'rt';
  }

  /**
   * Возвращает refresh-токен или выбрасывает, если токена нет.
   */
  getTokenOrThrow(req: Request, bodyToken?: string): string {
    const token = this.getToken(req, bodyToken);
    if (!token) {
      throw new UnauthorizedException(
        'Refresh token required (cookie or body)',
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
    const isProd = this.configService.get<string>('nodeEnv') === 'production';
    const domain =
      this.configService.get<string>('auth.cookieDomain') || undefined;

    const baseOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      ...(domain ? { domain } : {}),
    };

    if (rememberMe) {
      const maxAgeMs =
        RefreshCookieService.REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000;
      res.cookie(this.cookieName, token, {
        ...baseOptions,
        maxAge: maxAgeMs,
        expires: new Date(Date.now() + maxAgeMs),
      });
    } else {
      // Сессионная кука — без maxAge и expires, умирает при закрытии браузера
      res.cookie(this.cookieName, token, baseOptions);
    }
  }

  /**
   * Удаляет refresh-куку из ответа, если режим httpOnly включён.
   */
  clearIfEnabled(res: Response): void {
    if (!this.isEnabled) return;
    const isProd = this.configService.get<string>('nodeEnv') === 'production';
    const domain =
      this.configService.get<string>('auth.cookieDomain') || undefined;
    res.clearCookie(this.cookieName, {
      path: '/',
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      ...(domain ? { domain } : {}),
    });
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
