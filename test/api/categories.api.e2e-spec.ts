/**
 * API E2E: Categories endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';

describe('Categories API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyE2eGlobalPrefix(app);
    await app.init();
  });

  it('GET /categories returns list', () =>
    request(app.getHttpServer())
      .get(api('/categories'))
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      }));

  it('GET /categories/:id returns category when exists', async () => {
    const listRes = await request(app.getHttpServer()).get(api('/categories'));
    const list = listRes.body as unknown[];
    if (
      list.length > 0 &&
      list[0] &&
      typeof list[0] === 'object' &&
      'id' in list[0]
    ) {
      const id = (list[0] as { id: string }).id;
      await request(app.getHttpServer())
        .get(api(`/categories/${id}`))
        .expect(200);
    }
  });

  it('GET /categories/stats/overview returns stats or requires auth', () =>
    request(app.getHttpServer())
      .get(api('/categories/stats/overview'))
      .expect((res) => expect([200, 401]).toContain(res.status)));

  it('POST /categories requires auth', () =>
    request(app.getHttpServer())
      .post(api('/categories'))
      .send({ name: 'Test', slug: 'test' })
      .expect(401));
});
