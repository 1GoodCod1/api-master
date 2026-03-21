/**
 * API E2E: Auth endpoints
 * Run: npm run test:api (or jest --config test/jest-e2e.json)
 * Requires: DATABASE_URL, REDIS (or mock), JWT secrets in env
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

/** +373 + exactly 8 digits (RegisterDto); unique per call to avoid DB collisions in e2e */
function uniqueMoldovanPhone(): string {
  return `+373${String(randomInt(10_000_000, 99_999_999))}`;
}

describe('Auth API (e2e)', () => {
  let app: INestApplication<App>;
  const timestamp = Date.now();
  const unique = `${timestamp}-${Math.random().toString(36).slice(2, 10)}`;
  const testEmail = `api-auth-${unique}@test.local`;
  const testPassword = 'TestPass1!@#';
  const testPhone = uniqueMoldovanPhone();
  const testPhoneOther = uniqueMoldovanPhone();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('GET /auth/registration-options', () => {
    it('returns cities and categories', () =>
      request(app.getHttpServer())
        .get('/auth/registration-options')
        .expect(200)
        .expect((res) => {
          const body = res.body as Record<string, unknown>;
          expect(body.cities).toBeDefined();
          expect(body.categories).toBeDefined();
          expect(Array.isArray(body.cities)).toBe(true);
          expect(Array.isArray(body.categories)).toBe(true);
        }));
  });

  describe('POST /auth/register', () => {
    it('registers new client', () =>
      request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          phone: testPhone,
          password: testPassword,
          firstName: 'API',
          lastName: 'Test',
          role: 'CLIENT',
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as Record<string, unknown>;
          expect(body.accessToken).toBeDefined();
          expect(body.user).toBeDefined();
          expect((body.user as Record<string, unknown>)?.email).toBe(testEmail);
        }));

    it('rejects duplicate email', () =>
      request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          phone: testPhoneOther,
          password: testPassword,
          firstName: 'API2',
          lastName: 'Test2',
          role: 'CLIENT',
        })
        .expect((res) => {
          expect([400, 409]).toContain(res.status);
        }));
  });

  describe('POST /auth/login', () => {
    it('logs in with valid credentials', () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200)
        .expect((res) => {
          const body = res.body as Record<string, unknown>;
          expect(body.accessToken).toBeDefined();
          expect(body.user).toBeDefined();
        }));

    it('rejects invalid password', () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: 'WrongPass1!' })
        .expect(401));
  });

  describe('GET /auth/early-bird-status', () => {
    it('returns early bird status', () =>
      request(app.getHttpServer()).get('/auth/early-bird-status').expect(200));
  });

  describe('POST /auth/forgot-password', () => {
    it('accepts valid email', () =>
      request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testEmail })
        .expect((res) => expect([200, 202, 404]).toContain(res.status)));
  });

  describe('GET /auth/me', () => {
    let token: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword });
      const body = res.body as Record<string, unknown>;
      token = typeof body.accessToken === 'string' ? body.accessToken : '';
    });

    it('returns profile with valid token', () =>
      request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as Record<string, unknown>;
          const email =
            body.email ?? (body.user as Record<string, unknown>)?.email;
          expect(email).toBe(testEmail);
        }));

    it('rejects without token', () =>
      request(app.getHttpServer()).get('/auth/me').expect(401));
  });
});
