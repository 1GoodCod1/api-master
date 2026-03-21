/**
 * API E2E: Users endpoints (admin/auth required)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';

describe('Users API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyE2eGlobalPrefix(app);
    await app.init();
  });

  it('GET /users/:id requires auth', () =>
    request(app.getHttpServer()).get(api('/users/any-id')).expect(401));

  it('PUT /users/me/avatar requires auth', () =>
    request(app.getHttpServer())
      .put(api('/users/me/avatar'))
      .send({ avatarUrl: 'http://x' })
      .expect(401));

  it('GET /users/me/photos requires auth', () =>
    request(app.getHttpServer()).get(api('/users/me/photos')).expect(401));
});
