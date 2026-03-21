/**
 * API E2E: Reports endpoints (auth required)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';
import { getClientToken } from '../api-helpers';

describe('Reports API (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyE2eGlobalPrefix(app);
    await app.init();
    token = await getClientToken(app, 'reports');
  });

  it('GET /reports/my-reports requires auth', () =>
    request(app.getHttpServer()).get(api('/reports/my-reports')).expect(401));

  it('GET /reports/my-reports returns list when authenticated', () =>
    request(app.getHttpServer())
      .get(api('/reports/my-reports'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200));

  it('POST /reports requires auth', () =>
    request(app.getHttpServer())
      .post(api('/reports'))
      .send({ type: 'MASTER', targetId: 'any', reason: 'test' })
      .expect(401));
});
