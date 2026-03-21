/**
 * API E2E: Notifications endpoints (auth required)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';
import { getClientToken } from '../api-helpers';

describe('Notifications API (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyE2eGlobalPrefix(app);
    await app.init();
    token = await getClientToken(app, 'notif');
  });

  it('GET /notifications requires auth', () =>
    request(app.getHttpServer()).get(api('/notifications')).expect(401));

  it('GET /notifications returns list when authenticated', () =>
    request(app.getHttpServer())
      .get(api('/notifications'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200));

  it('GET /notifications/unread-count returns count when authenticated', () =>
    request(app.getHttpServer())
      .get(api('/notifications/unread-count'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200));
});
