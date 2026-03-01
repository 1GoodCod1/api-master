/**
 * API E2E: Promotions endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { getMasterId } from '../api-helpers';

describe('Promotions API (e2e)', () => {
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

  it('GET /promotions/active returns active promotions', () =>
    request(app.getHttpServer()).get('/promotions/active').expect(200));

  it('GET /promotions/master/:masterId returns master promotions', async () => {
    if (!masterId) return;
    await request(app.getHttpServer())
      .get(`/promotions/master/${masterId}`)
      .expect(200);
  });

  it('GET /promotions/my requires auth', () =>
    request(app.getHttpServer()).get('/promotions/my').expect(401));
});
