/**
 * API E2E: Cache warming endpoints (admin/internal)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

describe('Cache Warming API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('POST /cache-warming/warm returns status', () =>
    request(app.getHttpServer())
      .post('/cache-warming/warm')
      .expect((res) => expect([200, 201, 401, 403]).toContain(res.status)));
});
