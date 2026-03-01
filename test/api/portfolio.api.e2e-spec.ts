/**
 * API E2E: Portfolio endpoints (auth required for mutations)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { getMasterId } from '../api-helpers';

describe('Portfolio API (e2e)', () => {
  let app: INestApplication<App>;
  let masterId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    masterId = await getMasterId(app);
  });

  it('GET /portfolio/master/:masterId returns portfolio (public)', async () => {
    if (!masterId) return;
    await request(app.getHttpServer())
      .get(`/portfolio/master/${masterId}`)
      .expect(200);
  });

  it('GET /portfolio/master/:masterId/tags returns tags (public)', async () => {
    if (!masterId) return;
    await request(app.getHttpServer())
      .get(`/portfolio/master/${masterId}/tags`)
      .expect(200);
  });

  it('POST /portfolio requires auth', () =>
    request(app.getHttpServer())
      .post('/portfolio')
      .send({ title: 'Test', masterId: masterId || 'any' })
      .expect(401));
});
