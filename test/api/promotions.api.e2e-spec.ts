/**
 * API E2E: Promotions endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';
import { getMasterId } from '../api-helpers';

describe('Promotions API (e2e)', () => {
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

  it('GET /promotions/active returns active promotions', () =>
    request(app.getHttpServer()).get(api('/promotions/active')).expect(200));

  it('GET /promotions/master/:masterId returns master promotions', async () => {
    if (!masterId) return;
    await request(app.getHttpServer())
      .get(api(`/promotions/master/${masterId}`))
      .expect(200);
  });

  it('GET /promotions/my requires auth', () =>
    request(app.getHttpServer()).get(api('/promotions/my')).expect(401));
});
