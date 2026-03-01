/**
 * API E2E: Payments endpoints (most require auth)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { getClientToken, getMasterId } from '../api-helpers';

describe('Payments API (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let masterId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    token = await getClientToken(app, 'pay');
    masterId = await getMasterId(app);
  });

  it('GET /payments/master/:masterId requires auth', async () => {
    if (!masterId) return;
    await request(app.getHttpServer())
      .get(`/payments/master/${masterId}`)
      .expect(401);
  });

  it('GET /payments/my-payments requires auth', () =>
    request(app.getHttpServer()).get('/payments/my-payments').expect(401));

  it('GET /payments/my-payments returns list or 403 when authenticated', () =>
    request(app.getHttpServer())
      .get('/payments/my-payments')
      .set('Authorization', `Bearer ${token}`)
      .expect((res) => expect([200, 403]).toContain(res.status)));

  it('POST /payments/create-checkout requires auth', () =>
    request(app.getHttpServer())
      .post('/payments/create-checkout')
      .send({ tariffId: 'any', successUrl: 'http://x', cancelUrl: 'http://x' })
      .expect(401));
});
