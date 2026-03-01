/**
 * API E2E: App / health endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

describe('App API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET / returns status', () =>
    request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        const body = res.body as Record<string, unknown>;
        expect(body).toBeDefined();
        expect(body.success !== undefined || body.code !== undefined).toBe(
          true,
        );
      }));

  it('GET /health returns health', () =>
    request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as Record<string, unknown>;
        expect(body.status).toBeDefined();
      }));

  it('GET /ping returns pong', () =>
    request(app.getHttpServer())
      .get('/ping')
      .expect(200)
      .expect((res) => {
        const body = res.body as Record<string, unknown>;
        expect(body.success).toBe(true);
      }));

  it('GET /liveness returns alive', () =>
    request(app.getHttpServer())
      .get('/liveness')
      .expect(200)
      .expect((res) => {
        const body = res.body as Record<string, unknown>;
        expect(body.status).toBe('alive');
      }));

  it('GET /version returns version info', () =>
    request(app.getHttpServer())
      .get('/version')
      .expect(200)
      .expect((res) => {
        const body = res.body as Record<string, unknown>;
        expect(body).toBeDefined();
      }));

  it('GET /readiness returns readiness status', () =>
    request(app.getHttpServer())
      .get('/readiness')
      .expect((res) => {
        expect([200, 503]).toContain(res.status);
      }));
});
