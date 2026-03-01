/**
 * API E2E: Export endpoints (auth required)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { getMasterId } from '../api-helpers';

describe('Export API (e2e)', () => {
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

  it('GET /export/leads/csv/:masterId requires auth', async () => {
    if (!masterId) return;
    await request(app.getHttpServer())
      .get(`/export/leads/csv/${masterId}`)
      .expect(401);
  });

  it('GET /export/leads/excel/:masterId requires auth', async () => {
    if (!masterId) return;
    await request(app.getHttpServer())
      .get(`/export/leads/excel/${masterId}`)
      .expect(401);
  });
});
