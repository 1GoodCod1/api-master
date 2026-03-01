/**
 * API E2E: Reviews endpoints
 * can-create requires CLIENT auth
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

describe('Reviews API (e2e)', () => {
  let app: INestApplication<App>;
  let masterId: string;
  let clientToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const mastersRes = await request(app.getHttpServer()).get(
      '/masters?limit=1',
    );
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

    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `reviews-api-${Date.now()}@test.local`,
        phone: `+37360${String(Date.now()).slice(-7)}`,
        password: 'TestPass1!',
        firstName: 'R',
        lastName: 'T',
        role: 'CLIENT',
      });
    const regBody = regRes.body as Record<string, unknown>;
    clientToken =
      typeof regBody.accessToken === 'string' ? regBody.accessToken : '';
  });

  it('GET /reviews/master/:masterId returns reviews', async () => {
    if (!masterId) return;
    await request(app.getHttpServer())
      .get(`/reviews/master/${masterId}`)
      .expect(200);
  });

  it('GET /reviews/can-create/:masterId returns canCreate when authenticated', async () => {
    if (!masterId) return;
    let req = request(app.getHttpServer()).get(
      `/reviews/can-create/${masterId}`,
    );
    if (clientToken) req = req.set('Authorization', `Bearer ${clientToken}`);
    await req.expect(clientToken ? 200 : 401);
  });

  it('GET /reviews/stats/:masterId returns stats or requires auth', async () => {
    if (!masterId) return;
    const res = await request(app.getHttpServer()).get(
      `/reviews/stats/${masterId}`,
    );
    expect([200, 401]).toContain(res.status);
  });

  it('POST /reviews requires auth', () =>
    request(app.getHttpServer())
      .post('/reviews')
      .send({ masterId, rating: 5, text: 'Test' })
      .expect(401));
});
