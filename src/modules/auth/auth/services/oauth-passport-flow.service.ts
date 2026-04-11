import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import passport from 'passport';
import { randomBytes } from 'crypto';
import { AppErrors } from '../../../../common/errors';
import type { GoogleOAuthUser } from '../strategies/google.strategy';
import { OAuthService } from './oauth.service';
import { RefreshCookieService } from './refresh-cookie.service';

@Injectable()
export class OAuthPassportFlowService {
  private readonly logger = new Logger(OAuthPassportFlowService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly oauthService: OAuthService,
    private readonly refreshCookie: RefreshCookieService,
  ) {}

  beginGoogle(
    role: string | undefined,
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    this.beginOAuth(
      'google',
      ['email', 'profile'],
      this.normalizeOAuthRoleQuery(role),
      req,
      res,
      next,
    );
  }

  /** Явный `role` — регистрация с выбранной ролью; без параметра — вход (существующий Google → сразу в аккаунт; новый → роль на /complete-profile). */
  private normalizeOAuthRoleQuery(
    role: string | undefined,
  ): 'CLIENT' | 'MASTER' | undefined {
    const r = role?.trim().toUpperCase();
    if (r === 'MASTER') return 'MASTER';
    if (r === 'CLIENT') return 'CLIENT';
    return undefined;
  }

  /**
   * OAuth callback должен вернуть Promise, иначе Nest отдаёт ответ до redirect → ERR_HTTP_HEADERS_SENT.
   */
  handleCallback(
    provider: 'google',
    req: Request,
    res: Response,
    _next: NextFunction,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('frontendUrl') || '';

    const oauthConfigured = !!this.configService
      .get<string>('oauth.google.clientId')
      ?.trim();
    if (!oauthConfigured) {
      this.refreshCookie.clearOAuthStateCookie(res);
      this.redirectOAuth(
        res,
        `${frontendUrl}/login?error=oauth_not_configured`,
      );
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      const onPassportNext: NextFunction = (err?: unknown) => {
        if (err == null) {
          return;
        }
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : (() => {
                  try {
                    return JSON.stringify(err);
                  } catch {
                    return 'unknown error';
                  }
                })();
        this.logger.error(`OAuth ${provider} passport next(): ${msg}`);
        this.refreshCookie.clearOAuthStateCookie(res);
        this.redirectOAuthLoginFailed(res, frontendUrl, 'middleware_error');
        finish();
      };

      const middleware = passport.authenticate(
        provider,
        { session: false },
        (err: Error | null, user: GoogleOAuthUser | false) => {
          this.refreshCookie.clearOAuthStateCookie(res);

          if (err || !user) {
            const msg = err instanceof Error ? err.message : String(err ?? '');
            const isStateMismatch = msg.includes('Invalid OAuth state');
            let reason = isStateMismatch
              ? 'invalid_oauth_state'
              : err
                ? 'passport_error'
                : 'no_user';
            const tokenDetail = err ? oauthTokenExchangeDetail(err) : '';
            const callbackHint = this.configService.get<string>(
              'oauth.google.callbackUrl',
            );
            if (err && reason === 'passport_error') {
              const sub = oauthFailureReasonFromTokenErr(err);
              if (sub) reason = sub;
            }
            this.logger.warn(
              [
                `OAuth ${provider} callback rejected: ${reason} — ${msg || '(no message)'}`,
                tokenDetail ? `token_response: ${tokenDetail}` : '',
                callbackHint ? `OAUTH_CALLBACK_URL=${callbackHint}` : '',
              ]
                .filter(Boolean)
                .join(' | '),
            );
            this.redirectOAuthLoginFailed(res, frontendUrl, reason);
            finish();
            return;
          }

          void this.oauthService.handleOAuthCallback(user).then(
            (result) => {
              try {
                if (result.type === 'pending') {
                  this.refreshCookie.attachOAuthPendingToken(
                    res,
                    result.pendingToken,
                  );
                  const roleQs =
                    user.role === 'MASTER' || user.role === 'CLIENT'
                      ? `?role=${user.role}`
                      : '';
                  this.redirectOAuth(
                    res,
                    `${frontendUrl}/auth/complete-profile${roleQs}`,
                  );
                } else {
                  this.refreshCookie.attachIfEnabled(
                    res,
                    result.refreshToken,
                    true,
                  );
                  this.redirectOAuth(
                    res,
                    `${frontendUrl}/auth/oauth-callback?access_token=${encodeURIComponent(result.accessToken)}`,
                  );
                }
              } finally {
                finish();
              }
            },
            (e) => {
              const msg = e instanceof Error ? e.message : String(e);
              this.logger.error(
                `OAuth ${provider} handleOAuthCallback failed: ${msg}`,
              );
              this.redirectOAuthLoginFailed(res, frontendUrl, 'handler_error');
              finish();
            },
          );
        },
      ) as RequestHandler;
      middleware(req, res, onPassportNext);
    });
  }

  private beginOAuth(
    provider: 'google',
    scope: string[],
    registerRole: 'CLIENT' | 'MASTER' | undefined,
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const configured = !!this.configService
      .get<string>('oauth.google.clientId')
      ?.trim();
    if (!configured) {
      throw AppErrors.serviceUnavailable(
        'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      );
    }
    const state = this.buildState(registerRole);
    this.refreshCookie.setOAuthStateCookie(res, state);
    const mw = passport.authenticate(provider, {
      scope,
      session: false,
      state,
    }) as RequestHandler;
    mw(req, res, next);
  }

  private buildState(registerRole?: 'CLIENT' | 'MASTER'): string {
    const nonce = randomBytes(16).toString('hex');
    const payload =
      registerRole === undefined
        ? { flow: 'login', nonce }
        : { role: registerRole, nonce };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private redirectOAuthLoginFailed(
    res: Response,
    frontendUrl: string,
    reason: string,
  ): void {
    if (res.headersSent) {
      return;
    }
    const isProd = this.configService.get<string>('nodeEnv') === 'production';
    const loginFailed = `${frontendUrl}/login?error=oauth_failed`;
    const url = isProd
      ? loginFailed
      : `${loginFailed}&reason=${encodeURIComponent(
          reason.replace(/[^a-z0-9_]/gi, '_').slice(0, 64),
        )}`;
    try {
      res.redirect(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`OAuth redirect to login skipped: ${msg}`);
    }
  }

  private redirectOAuth(res: Response, url: string): void {
    if (res.headersSent) {
      return;
    }
    try {
      res.redirect(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`OAuth redirect skipped: ${msg}`);
    }
  }
}

/** Детали ошибки обмена code→token (passport-oauth2), только для логов. */
function oauthTokenExchangeDetail(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  const e = err as {
    name?: string;
    message?: string;
    code?: string;
    oauthError?: unknown;
    statusCode?: number;
    data?: unknown;
  };

  if (e.name === 'TokenError' && typeof e.code === 'string') {
    const msg = typeof e.message === 'string' ? e.message : '';
    return `token_error code=${e.code}${msg ? `: ${msg}` : ''}`;
  }

  const oauthErr = e.oauthError;
  if (oauthErr instanceof Error) {
    const sys =
      'code' in oauthErr &&
      typeof (oauthErr as NodeJS.ErrnoException).code === 'string'
        ? (oauthErr as NodeJS.ErrnoException).code
        : '';
    return `network: ${oauthErr.message}${sys ? ` (${sys})` : ''}`;
  }

  if (oauthErr && typeof oauthErr === 'object') {
    const oe = oauthErr as { statusCode?: number; data?: unknown };
    let dataStr = '';
    if (typeof oe.data === 'string') {
      dataStr = oe.data.length > 800 ? `${oe.data.slice(0, 800)}…` : oe.data;
    } else if (oe.data != null && Buffer.isBuffer(oe.data)) {
      const s = oe.data.toString('utf8');
      dataStr = s.length > 800 ? `${s.slice(0, 800)}…` : s;
    } else if (oe.data != null) {
      try {
        dataStr = JSON.stringify(oe.data).slice(0, 800);
      } catch {
        dataStr = '[unserializable token error body]';
      }
    }
    const status = oe.statusCode != null ? `http=${oe.statusCode}` : '';
    const joined = [status, dataStr].filter(Boolean).join(' ');
    if (joined) return joined;
  }

  if (typeof e.statusCode === 'number' && e.data != null) {
    const d = e.data;
    const dataStr =
      typeof d === 'string'
        ? d.slice(0, 800)
        : (() => {
            try {
              return JSON.stringify(d).slice(0, 800);
            } catch {
              return '';
            }
          })();
    return `http=${e.statusCode} ${dataStr}`.trim();
  }

  return typeof e.message === 'string' ? e.message : '';
}

function oauthFailureReasonFromTokenErr(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as { name?: string; code?: string };
  if (e.name === 'TokenError' && typeof e.code === 'string') {
    const c = e.code.toLowerCase();
    if (c === 'redirect_uri_mismatch') return 'oauth_redirect_mismatch';
    if (c === 'invalid_client') return 'oauth_invalid_client_secret';
    if (c === 'invalid_grant') return 'oauth_invalid_grant';
  }
  const blob = oauthTokenExchangeDetail(err).toLowerCase();
  if (blob.includes('redirect_uri_mismatch')) return 'oauth_redirect_mismatch';
  if (blob.includes('invalid_client')) return 'oauth_invalid_client_secret';
  if (blob.includes('invalid_grant')) return 'oauth_invalid_grant';
  return null;
}
