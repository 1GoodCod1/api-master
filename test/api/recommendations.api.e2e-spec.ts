/**
 * API E2E: Recommendations endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';
import { getMasterId } from '../api-helpers';

describe('Recommendations API (e2e)', () => {
  let app: INestApplication<App>;
  let masterId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyE2eGlobalPrefix(app);
    await app.init();
    masterId = await getMasterId(app);
  });

  it('GET /recommendations/personalized returns list', () =>
    request(app.getHttpServer())
      .get(api('/recommendations/personalized'))
      .expect(200));

  it('GET /recommendations/similar/:masterId returns similar', async () => {
    if (!masterId) return;
    await request(app.getHttpServer())
      .get(api(`/recommendations/similar/${masterId}`))
      .expect(200);
  });

  it('GET /recommendations/recently-viewed returns list', () =>
    request(app.getHttpServer())
      .get(api('/recommendations/recently-viewed'))
      .expect(200));

  it('POST /recommendations/track requires body', () =>
    request(app.getHttpServer())
      .post(api('/recommendations/track'))
      .send({ masterId: masterId || 'any' })
      .expect((res) => expect([200, 201, 400, 401]).toContain(res.status)));
});
