/**
 * API E2E: Export endpoints (auth required)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';
import { getMasterId } from '../api-helpers';

describe('Export API (e2e)', () => {
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

  it('GET /export/leads/csv/:masterId requires auth', async () => {
    if (!masterId) return;
    await request(app.getHttpServer())
      .get(api(`/export/leads/csv/${masterId}`))
      .expect(401);
  });

  it('GET /export/leads/excel/:masterId requires auth', async () => {
    if (!masterId) return;
    await request(app.getHttpServer())
      .get(api(`/export/leads/excel/${masterId}`))
      .expect(401);
  });

  it('POST /export/queue/excel/:masterId requires auth', async () => {
    if (!masterId) return;
    await request(app.getHttpServer())
      .post(api(`/export/queue/excel/${masterId}`))
      .expect(401);
  });
});
