/**
 * API E2E: Tariffs endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

describe('Tariffs API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /tariffs returns list', () =>
    request(app.getHttpServer()).get('/tariffs').expect(200));

  it('GET /tariffs/active returns active', () =>
    request(app.getHttpServer()).get('/tariffs/active').expect(200));

  it('GET /tariffs/:id returns tariff when exists', async () => {
    const listRes = await request(app.getHttpServer()).get('/tariffs');
    const list = listRes.body as unknown[];
    if (
      list.length > 0 &&
      list[0] &&
      typeof list[0] === 'object' &&
      'id' in list[0]
    ) {
      const id = (list[0] as { id: string }).id;
      await request(app.getHttpServer()).get(`/tariffs/${id}`).expect(200);
    }
  });

  it('POST /tariffs requires auth', () =>
    request(app.getHttpServer())
      .post('/tariffs')
      .send({ name: 'Test', price: 10 })
      .expect(401));
});
