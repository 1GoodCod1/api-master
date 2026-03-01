/**
 * API E2E: Cities endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

describe('Cities API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /cities returns list', () =>
    request(app.getHttpServer())
      .get('/cities')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      }));

  it('GET /cities/:id returns city when exists', async () => {
    const listRes = await request(app.getHttpServer()).get('/cities');
    const list = listRes.body as unknown[];
    if (
      list.length > 0 &&
      list[0] &&
      typeof list[0] === 'object' &&
      'id' in list[0]
    ) {
      const id = (list[0] as { id: string }).id;
      await request(app.getHttpServer()).get(`/cities/${id}`).expect(200);
    }
  });

  it('GET /cities/stats/overview returns stats or requires auth', () =>
    request(app.getHttpServer())
      .get('/cities/stats/overview')
      .expect((res) => expect([200, 401]).toContain(res.status)));

  it('POST /cities requires auth', () =>
    request(app.getHttpServer())
      .post('/cities')
      .send({ name: 'Test', slug: 'test' })
      .expect(401));
});
