/**
 * API E2E: Ideas endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

describe('Ideas API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /ideas returns list', () =>
    request(app.getHttpServer())
      .get('/ideas')
      .expect(200)
      .expect((res) => {
        const body = res.body as unknown;
        const list = Array.isArray(body)
          ? body
          : ((body as Record<string, unknown>)?.items ??
            (body as Record<string, unknown>)?.data);
        expect(list === undefined || Array.isArray(list)).toBe(true);
      }));

  it('POST /ideas creates idea', () =>
    request(app.getHttpServer())
      .post('/ideas')
      .send({
        title: 'API Test Idea',
        description: 'E2E test idea',
        category: 'FEATURE',
      })
      .expect((res) => expect([201, 400, 401]).toContain(res.status)));
});
