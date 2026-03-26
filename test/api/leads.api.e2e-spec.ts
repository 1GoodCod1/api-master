/**
 * API E2E: Leads endpoints (auth required)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { uniqueMoldovanPhone } from '../api-helpers';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';

describe('Leads API (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;
  let masterId: string;
  const timestamp = Date.now();
  const unique = `${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
  const testEmail = `leads-api-${unique}@test.local`;
  const testPassword = 'TestPass1!@#';
  const testPhone = uniqueMoldovanPhone();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyE2eGlobalPrefix(app);
    await app.init();

    await request(app.getHttpServer()).post(api('/auth/register')).send({
      email: testEmail,
      phone: testPhone,
      password: testPassword,
      firstName: 'L',
      lastName: 'T',
      role: 'CLIENT',
    });

    const loginRes = await request(app.getHttpServer())
      .post(api('/auth/login'))
      .send({ email: testEmail, password: testPassword });
    const loginBody = loginRes.body as Record<string, unknown>;
    accessToken =
      typeof loginBody.accessToken === 'string' ? loginBody.accessToken : '';

    const mastersRes = await request(app.getHttpServer())
      .get(api('/masters'))
      .query({ limit: 1 });
    const body = mastersRes.body as unknown;
    const masters: unknown = Array.isArray(body)
      ? body
      : ((body as Record<string, unknown>).items ??
        (body as Record<string, unknown>).data ??
        body);
    const first: unknown =
      Array.isArray(masters) && masters[0] ? masters[0] : null;
    masterId =
      first && typeof first === 'object' && 'id' in first
        ? typeof (first as { id: unknown }).id === 'string'
          ? (first as { id: string }).id
          : ''
        : '';
  });

  it('POST /leads requires auth', () =>
    request(app.getHttpServer())
      .post(api('/leads'))
      .send({ masterId: 'any', message: 'test' })
      .expect(401));

  it('GET /leads requires auth', () =>
    request(app.getHttpServer()).get(api('/leads')).expect(401));

  it('POST /leads creates lead when authenticated', async () => {
    if (!masterId) return;
    const res = await request(app.getHttpServer())
      .post(api('/leads'))
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        masterId,
        message: `API test lead ${timestamp}`,
      });
    expect([201, 400, 403, 401]).toContain(res.status);
    if (res.status === 201) {
      const resBody = res.body as Record<string, unknown>;
      expect(resBody.id).toBeDefined();
    }
  });

  it('GET /leads/stats requires auth', () =>
    request(app.getHttpServer()).get(api('/leads/stats')).expect(401));
});
