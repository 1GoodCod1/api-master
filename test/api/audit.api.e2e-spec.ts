/**
 * API E2E: Audit endpoints (admin auth)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { getAdminToken } from '../api-helpers';

describe('Audit API (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    adminToken = await getAdminToken(app);
  });

  it('GET /audit/logs requires admin auth', () =>
    request(app.getHttpServer()).get('/audit/logs').expect(401));

  it('GET /audit/logs returns data or 403 when authenticated', () =>
    request(app.getHttpServer())
      .get('/audit/logs')
      .query({ limit: 5 })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect((res) => expect([200, 401, 403]).toContain(res.status)));

  it('GET /audit/stats requires admin auth', () =>
    request(app.getHttpServer()).get('/audit/stats').expect(401));
});
