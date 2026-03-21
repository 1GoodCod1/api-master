/**
 * API E2E: Verification endpoints (admin/verification flow)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';
import { getClientToken } from '../api-helpers';

describe('Verification API (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyE2eGlobalPrefix(app);
    await app.init();
    token = await getClientToken(app, 'verif');
  });

  it('GET /verification/my-status requires auth', () =>
    request(app.getHttpServer())
      .get(api('/verification/my-status'))
      .expect(401));

  it('GET /verification/my-status returns status or 403 when authenticated', () =>
    request(app.getHttpServer())
      .get(api('/verification/my-status'))
      .set('Authorization', `Bearer ${token}`)
      .expect((res) => expect([200, 403]).toContain(res.status)));

  it('POST /verification/submit requires auth', () =>
    request(app.getHttpServer())
      .post(api('/verification/submit'))
      .send({ documents: [] })
      .expect(401));
});
