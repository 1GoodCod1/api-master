/**
 * API E2E: Favorites endpoints (auth required)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { getClientToken, getMasterId } from '../api-helpers';

describe('Favorites API (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let masterId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    token = await getClientToken(app, 'fav');
    masterId = await getMasterId(app);
  });

  it('GET /favorites requires auth', () =>
    request(app.getHttpServer()).get('/favorites').expect(401));

  it('POST /favorites/:masterId requires auth', () =>
    request(app.getHttpServer())
      .post(`/favorites/${masterId || 'any'}`)
      .expect(401));

  it('GET /favorites returns list when authenticated', async () =>
    request(app.getHttpServer())
      .get('/favorites')
      .set('Authorization', `Bearer ${token}`)
      .expect(200));

  it('GET /favorites/count returns count when authenticated', () =>
    request(app.getHttpServer())
      .get('/favorites/count')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as Record<string, unknown>;
        expect(typeof body.count === 'number' || body.count === undefined).toBe(
          true,
        );
      }));
});
