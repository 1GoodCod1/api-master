import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { uniqueMoldovanPhone } from '../api-helpers';
import { api } from './e2e-prefix';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PENDING_SECRET =
  process.env.JWT_OAUTH_PENDING_SECRET ||
  'test-jwt-oauth-pending-secret-min-32-chars';

interface PendingOverrides {
  providerId?: string;
  email?: string;
  role?: 'CLIENT' | 'MASTER';
}

function makePendingToken(
  jwtSvc: JwtService,
  overrides: PendingOverrides = {},
): string {
  const { providerId, email, role } = overrides;
  return jwtSvc.sign(
    {
      type: 'oauth_pending',
      provider: 'GOOGLE',
      providerId:
        providerId ??
        `g-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email,
      firstName: 'Ivan',
      lastName: 'Petrov',
      picture: undefined,
      ...(role !== undefined ? { role } : {}),
    },
    { secret: PENDING_SECRET, expiresIn: '15m' },
  );
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('OAuth API (e2e)', () => {
  let app: INestApplication<App>;
  let jwtSvc: JwtService;
  let citySlug: string;
  let categorySlug: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyE2eGlobalPrefix(app);
    await app.init();
    jwtSvc = new JwtService({});

    // Resolve valid city/category slugs from the seeded DB for MASTER tests
    const optRes = await request(app.getHttpServer())
      .get(api('/auth/registration-options'))
      .expect(200);
    const body = optRes.body as {
      cities: { slug: string }[];
      categories: { slug: string }[];
    };
    citySlug = body.cities?.[0]?.slug ?? 'chisinau';
    categorySlug = body.categories?.[0]?.slug ?? 'plumbing';
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Provider not configured (GOOGLE_CLIENT_ID absent in test env)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /auth/google — not configured', () => {
    it('returns 503 when GOOGLE_CLIENT_ID is absent', () =>
      request(app.getHttpServer()).get(api('/auth/google')).expect(503));

    it('returns 503 with ?role=CLIENT when GOOGLE_CLIENT_ID is absent', () =>
      request(app.getHttpServer())
        .get(api('/auth/google?role=CLIENT'))
        .expect(503));

    it('returns 503 with ?role=MASTER when GOOGLE_CLIENT_ID is absent', () =>
      request(app.getHttpServer())
        .get(api('/auth/google?role=MASTER'))
        .expect(503));
  });

  describe('GET /auth/google/callback — not configured', () => {
    it('redirects to /login?error=oauth_not_configured', async () => {
      const res = await request(app.getHttpServer())
        .get(api('/auth/google/callback'))
        .redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('error=oauth_not_configured');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /auth/oauth/complete
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /auth/oauth/complete', () => {
    // ── Validation ────────────────────────────────────────────────────────────

    it('400 when pendingToken is absent from both body and cookie', () =>
      request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({ phone: uniqueMoldovanPhone() })
        .expect(400));

    it('400 when pendingToken is whitespace-only', () =>
      request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({ pendingToken: '   ', phone: uniqueMoldovanPhone() })
        .expect(400));

    it('400 when phone format is invalid', () => {
      const token = makePendingToken(jwtSvc, { role: 'CLIENT' });
      return request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({ pendingToken: token, phone: '123' })
        .expect(400);
    });

    it('401 when pendingToken is a malformed JWT', () =>
      request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({ pendingToken: 'not.a.valid.jwt', phone: uniqueMoldovanPhone() })
        .expect(401));

    it('401 when pendingToken is signed with wrong secret', () => {
      const wrongToken = jwtSvc.sign(
        { type: 'oauth_pending', provider: 'GOOGLE', providerId: 'x' },
        { secret: 'wrong-secret-that-is-definitely-32b', expiresIn: '15m' },
      );
      return request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({ pendingToken: wrongToken, phone: uniqueMoldovanPhone() })
        .expect(401);
    });

    it('401 when pendingToken has wrong type field', () => {
      const token = jwtSvc.sign(
        { type: 'access_token', sub: 'u1', role: 'CLIENT' },
        { secret: PENDING_SECRET, expiresIn: '15m' },
      );
      return request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({ pendingToken: token, phone: uniqueMoldovanPhone() })
        .expect(401);
    });

    it('401 when pendingToken is expired', () => {
      const token = jwtSvc.sign(
        { type: 'oauth_pending', provider: 'GOOGLE', providerId: 'x-exp' },
        { secret: PENDING_SECRET, expiresIn: 0 },
      );
      return request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({ pendingToken: token, phone: uniqueMoldovanPhone() })
        .expect(401);
    });

    it('400 when neither JWT nor body contains a role', () => {
      const token = makePendingToken(jwtSvc, { role: undefined });
      return request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({ pendingToken: token, phone: uniqueMoldovanPhone() })
        .expect(400);
    });

    it('400 for MASTER without city', () => {
      const token = makePendingToken(jwtSvc, { role: 'MASTER' });
      return request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({
          pendingToken: token,
          phone: uniqueMoldovanPhone(),
          category: categorySlug,
        })
        .expect(400);
    });

    it('400 for MASTER without category', () => {
      const token = makePendingToken(jwtSvc, { role: 'MASTER' });
      return request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({
          pendingToken: token,
          phone: uniqueMoldovanPhone(),
          city: citySlug,
        })
        .expect(400);
    });

    it('400 for MASTER with non-existent city slug', () => {
      const token = makePendingToken(jwtSvc, { role: 'MASTER' });
      return request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({
          pendingToken: token,
          phone: uniqueMoldovanPhone(),
          city: 'city-that-does-not-exist',
          category: categorySlug,
        })
        .expect(400);
    });

    it('400 for MASTER with non-existent category slug', () => {
      const token = makePendingToken(jwtSvc, { role: 'MASTER' });
      return request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({
          pendingToken: token,
          phone: uniqueMoldovanPhone(),
          city: citySlug,
          category: 'category-that-does-not-exist',
        })
        .expect(400);
    });

    // ── Success paths ─────────────────────────────────────────────────────────

    it('200 creates CLIENT and returns accessToken + user with role CLIENT', async () => {
      const token = makePendingToken(jwtSvc, { role: 'CLIENT' });

      const res = await request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({ pendingToken: token, phone: uniqueMoldovanPhone() })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body.accessToken).toBeDefined();
      expect(typeof body.accessToken).toBe('string');
      const user = body.user as Record<string, unknown>;
      expect(user.role).toBe('CLIENT');
    });

    it('200 CLIENT: role resolved from DTO when absent in JWT', async () => {
      const token = makePendingToken(jwtSvc, { role: undefined });

      const res = await request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({
          pendingToken: token,
          phone: uniqueMoldovanPhone(),
          role: 'CLIENT',
        })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body.accessToken).toBeDefined();
      expect((body.user as Record<string, unknown>).role).toBe('CLIENT');
    });

    it('200 creates MASTER and returns accessToken + user with role MASTER', async () => {
      const token = makePendingToken(jwtSvc, { role: 'MASTER' });

      const res = await request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({
          pendingToken: token,
          phone: uniqueMoldovanPhone(),
          city: citySlug,
          category: categorySlug,
        })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body.accessToken).toBeDefined();
      expect((body.user as Record<string, unknown>).role).toBe('MASTER');
    });

    // ── Conflict & idempotency ────────────────────────────────────────────────

    it('409 when phone is already registered by another user', async () => {
      const phone = uniqueMoldovanPhone();
      const token1 = makePendingToken(jwtSvc, {
        role: 'CLIENT',
        providerId: `g-ph-a-${Date.now()}`,
      });
      const token2 = makePendingToken(jwtSvc, {
        role: 'CLIENT',
        providerId: `g-ph-b-${Date.now()}`,
      });

      await request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({ pendingToken: token1, phone })
        .expect(200);

      await request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({ pendingToken: token2, phone })
        .expect(409);
    });

    it('200 re-using same pending token (pre-check finds existing account, returns login)', async () => {
      const providerId = `g-reuse-${Date.now()}`;
      const token = makePendingToken(jwtSvc, { role: 'CLIENT', providerId });

      const first = await request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({ pendingToken: token, phone: uniqueMoldovanPhone() })
        .expect(200);
      const second = await request(app.getHttpServer())
        .post(api('/auth/oauth/complete'))
        .send({ pendingToken: token, phone: uniqueMoldovanPhone() })
        .expect(200);

      const firstUser = (first.body as Record<string, unknown>).user as Record<
        string,
        unknown
      >;
      const secondUser = (second.body as Record<string, unknown>)
        .user as Record<string, unknown>;
      expect(secondUser.id).toBe(firstUser.id);
    });
  });
});
