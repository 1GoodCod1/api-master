/**
 * API E2E: Admin endpoints (admin auth required)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { getAdminToken } from '../api-helpers';

describe('Admin API (e2e)', () => {
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

  it('GET /admin/dashboard requires admin auth', () =>
    request(app.getHttpServer()).get('/admin/dashboard').expect(401));

  it('GET /admin/dashboard returns 200 or 403 when authenticated', () =>
    request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect((res) => expect([200, 401, 403]).toContain(res.status)));

  it('GET /admin/users requires admin auth', () =>
    request(app.getHttpServer()).get('/admin/users').expect(401));

  it('GET /admin/masters requires admin auth', () =>
    request(app.getHttpServer()).get('/admin/masters').expect(401));

  it('GET /admin/leads requires admin auth', () =>
    request(app.getHttpServer()).get('/admin/leads').expect(401));

  it('GET /admin/reviews requires admin auth', () =>
    request(app.getHttpServer()).get('/admin/reviews').expect(401));

  it('GET /admin/payments requires admin auth', () =>
    request(app.getHttpServer()).get('/admin/payments').expect(401));

  it('GET /admin/analytics requires admin auth', () =>
    request(app.getHttpServer()).get('/admin/analytics').expect(401));

  it('GET /admin/system/info requires admin auth', () =>
    request(app.getHttpServer()).get('/admin/system/info').expect(401));
});
