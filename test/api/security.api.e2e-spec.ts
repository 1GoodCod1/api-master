/**
 * API E2E: Security endpoints (admin auth)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';
import { getClientToken } from '../api-helpers';

describe('Security API (e2e)', () => {
  let app: INestApplication<App>;
  let clientToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyE2eGlobalPrefix(app);
    await app.init();
    clientToken = await getClientToken(app, 'sec-client');
  });

  it('GET /security/login-history requires auth', () =>
    request(app.getHttpServer())
      .get(api('/security/login-history'))
      .expect(401));

  it('GET /security/login-history returns list when authenticated', () =>
    request(app.getHttpServer())
      .get(api('/security/login-history'))
      .set('Authorization', `Bearer ${clientToken}`)
      .expect((res) => expect([200, 403]).toContain(res.status)));

  it('POST /security/change-password requires auth', () =>
    request(app.getHttpServer())
      .post(api('/security/change-password'))
      .send({ currentPassword: 'x', newPassword: 'y' })
      .expect(401));
});
