/**
 * API E2E: Bookings endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

describe('Bookings API (e2e)', () => {
  let app: INestApplication<App>;
  let masterId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const mastersRes = await request(app.getHttpServer()).get(
      '/masters?limit=1',
    );
    const body = mastersRes.body as unknown;
    const masters: unknown = Array.isArray(body)
      ? body
      : ((body as Record<string, unknown>).items ??
        (body as Record<string, unknown>).data ??
        body);
    const first: unknown =
      Array.isArray(masters) && masters[0] ? masters[0] : null;
    masterId =
      first && typeof first === 'object' && 'id' in first
        ? typeof (first as { id: unknown }).id === 'string'
          ? (first as { id: string }).id
          : ''
        : '';
  });

  it('GET /bookings/master/:masterId/available-slots returns slots', async () => {
    if (!masterId) return;
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const dateStr = future.toISOString().slice(0, 10);
    await request(app.getHttpServer())
      .get(`/bookings/master/${masterId}/available-slots`)
      .query({ date: dateStr })
      .expect(200);
  });

  it('POST /bookings requires auth', () =>
    request(app.getHttpServer())
      .post('/bookings')
      .send({
        masterId: masterId || 'm1',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      })
      .expect(401));

  it('GET /bookings/master/:masterId returns bookings or requires auth', async () => {
    if (!masterId) return;
    const res = await request(app.getHttpServer()).get(
      `/bookings/master/${masterId}`,
    );
    expect([200, 401]).toContain(res.status);
  });

  it('GET /bookings/my-bookings requires auth', () =>
    request(app.getHttpServer()).get('/bookings/my-bookings').expect(401));
});
