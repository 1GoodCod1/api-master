import { UnauthorizedException } from '@nestjs/common';
import { AppErrorMessages } from '../../../src/common/errors';
import { RefreshCookieService } from '../../../src/modules/auth/auth/services/refresh-cookie.service';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

function makeConfig(overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    'auth.useHttpOnlyCookie': true,
    'auth.refreshCookieName': 'rt_custom',
    nodeEnv: 'development',
    'auth.cookieDomain': undefined,
    'auth.oauthPendingCookieName': 'oauth_pending',
    'auth.oauthPendingCookieMaxMs': 900_000,
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => base[key]),
  } as unknown as ConfigService;
}

describe('RefreshCookieService', () => {
  describe('getToken / getTokenOrThrow', () => {
    it('prefers body token over cookie', () => {
      const svc = new RefreshCookieService(makeConfig());
      const req = {
        cookies: { rt_custom: 'from-cookie' },
      } as unknown as Request;
      expect(svc.getToken(req, '  body-token ')).toBe('body-token');
    });

    it('reads cookie when httpOnly enabled and body empty', () => {
      const svc = new RefreshCookieService(makeConfig());
      const req = { cookies: { rt_custom: 'c' } } as unknown as Request;
      expect(svc.getToken(req)).toBe('c');
    });

    it('getTokenOrThrow throws when no token', () => {
      const svc = new RefreshCookieService(
        makeConfig({ 'auth.useHttpOnlyCookie': false }),
      );
      const req = { cookies: {} } as unknown as Request;
      expect(() => svc.getTokenOrThrow(req)).toThrow(UnauthorizedException);
      expect(() => svc.getTokenOrThrow(req)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            message: AppErrorMessages.AUTH_REFRESH_TOKEN_REQUIRED,
          }),
        }),
      );
    });
  });

  describe('attachIfEnabled / clearIfEnabled', () => {
    it('sets session cookie when rememberMe false', () => {
      const svc = new RefreshCookieService(makeConfig());
      const cookie = jest.fn();
      const res = { cookie } as unknown as Response;
      svc.attachIfEnabled(res, 'tok', false);
      expect(cookie).toHaveBeenCalledWith(
        'rt_custom',
        'tok',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
      expect(cookie.mock.calls[0][2]).not.toHaveProperty('maxAge');
    });

    it('sets maxAge when rememberMe true', () => {
      const svc = new RefreshCookieService(makeConfig());
      const cookie = jest.fn();
      svc.attachIfEnabled({ cookie } as unknown as Response, 'tok', true);
      expect(cookie.mock.calls[0][2]).toMatchObject({
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    });

    it('clearIfEnabled no-op when cookie mode off', () => {
      const svc = new RefreshCookieService(
        makeConfig({ 'auth.useHttpOnlyCookie': false }),
      );
      const clearCookie = jest.fn();
      svc.clearIfEnabled({ clearCookie } as unknown as Response);
      expect(clearCookie).not.toHaveBeenCalled();
    });
  });

  describe('mergeCompleteOAuthDto', () => {
    it('merges pending token from cookie when body empty', () => {
      const svc = new RefreshCookieService(makeConfig());
      const req = {
        cookies: { oauth_pending: '  jwt-from-cookie  ' },
      } as unknown as Request;
      const merged = svc.mergeCompleteOAuthDto(req, {
        pendingToken: '',
        phone: '+37360000000',
      });
      expect(merged.pendingToken).toBe('jwt-from-cookie');
      expect(merged.phone).toBe('+37360000000');
    });

    it('prefers body pendingToken over cookie', () => {
      const svc = new RefreshCookieService(makeConfig());
      const req = {
        cookies: { oauth_pending: 'c' },
      } as unknown as Request;
      const merged = svc.mergeCompleteOAuthDto(req, {
        pendingToken: 'b',
        phone: '+37360000000',
      });
      expect(merged.pendingToken).toBe('b');
    });
  });

  describe('stripRefreshFromPayload / handleAuthSuccess', () => {
    it('stripRefreshFromPayload returns payload unchanged when cookie off', () => {
      const svc = new RefreshCookieService(
        makeConfig({ 'auth.useHttpOnlyCookie': false }),
      );
      const p = { accessToken: 'a', refreshToken: 'r' };
      expect(svc.stripRefreshFromPayload(p)).toEqual(p);
    });

    it('stripRefreshFromPayload omits refreshToken when cookie on', () => {
      const svc = new RefreshCookieService(makeConfig());
      expect(
        svc.stripRefreshFromPayload({ accessToken: 'a', refreshToken: 'r' }),
      ).toEqual({ accessToken: 'a' });
    });

    it('handleAuthSuccess attaches cookie and strips refresh + rememberMe', () => {
      const svc = new RefreshCookieService(makeConfig());
      const cookie = jest.fn();
      const res = { cookie, headersSent: false } as unknown as Response;
      const out = svc.handleAuthSuccess(
        { accessToken: 'a', refreshToken: 'r', rememberMe: true },
        res,
      );
      expect(out).toEqual({ accessToken: 'a' });
      expect(cookie).toHaveBeenCalled();
    });
  });

  describe('handleLogout', () => {
    it('calls logoutFn and clears cookie when token present', async () => {
      const svc = new RefreshCookieService(makeConfig());
      const clearCookie = jest.fn();
      const logoutFn = jest.fn().mockResolvedValue(undefined);
      const req = { cookies: { rt_custom: 'x' } } as unknown as Request;
      const r = await svc.handleLogout(
        req,
        { clearCookie } as unknown as Response,
        undefined,
        logoutFn,
      );
      expect(logoutFn).toHaveBeenCalledWith('x');
      expect(clearCookie).toHaveBeenCalled();
      expect(r.message).toContain('Logged out');
    });

    it('still clears cookie when no token', async () => {
      const svc = new RefreshCookieService(makeConfig());
      const clearCookie = jest.fn();
      const logoutFn = jest.fn();
      await svc.handleLogout(
        { cookies: {} } as unknown as Request,
        { clearCookie } as unknown as Response,
        undefined,
        logoutFn,
      );
      expect(logoutFn).not.toHaveBeenCalled();
      expect(clearCookie).toHaveBeenCalled();
    });
  });
});
