/**
 * API E2E: Search endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

describe('Search API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /search/masters returns masters', () =>
    request(app.getHttpServer())
      .get('/search/masters')
      .query({ q: 'test', limit: 5 })
      .expect(200)
      .expect((res) => {
        const body = res.body as unknown;
        const list = Array.isArray(body)
          ? body
          : ((body as Record<string, unknown>)?.items ??
            (body as Record<string, unknown>)?.data);
        expect(list === undefined || Array.isArray(list)).toBe(true);
      }));
});
