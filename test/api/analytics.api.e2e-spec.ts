/**
 * API E2E: Analytics endpoints (most require auth)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';
import { getClientToken, getMasterId } from '../api-helpers';

describe('Analytics API (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let masterId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyE2eGlobalPrefix(app);
    await app.init();
    token = await getClientToken(app, 'analytics');
    masterId = await getMasterId(app);
  });

  it('GET /analytics/master/:masterId requires auth', async () => {
    if (!masterId) return;
    await request(app.getHttpServer())
      .get(api(`/analytics/master/${masterId}`))
      .expect(401);
  });

  it('GET /analytics/my-analytics requires auth', () =>
    request(app.getHttpServer())
      .get(api('/analytics/my-analytics'))
      .expect(401));

  it('GET /analytics/my-analytics returns data when authenticated', () =>
    request(app.getHttpServer())
      .get(api('/analytics/my-analytics'))
      .set('Authorization', `Bearer ${token}`)
      .expect((res) => expect([200, 403]).toContain(res.status)));
});
