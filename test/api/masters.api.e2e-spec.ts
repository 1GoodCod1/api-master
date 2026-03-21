/**
 * API E2E: Masters endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';

describe('Masters API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyE2eGlobalPrefix(app);
    await app.init();
  });

  it('GET /masters returns paginated list', () =>
    request(app.getHttpServer())
      .get(api('/masters'))
      .query({ limit: 5, page: 1 })
      .expect(200)
      .expect((res) => {
        const body = res.body as unknown;
        const list: unknown = Array.isArray(body)
          ? body
          : ((body as Record<string, unknown>).items ??
            (body as Record<string, unknown>).data ??
            body);
        expect(Array.isArray(list)).toBe(true);
      }));

  it('GET /masters/filters returns filters', () =>
    request(app.getHttpServer()).get(api('/masters/filters')).expect(200));

  it('GET /masters/landing-stats returns stats', () =>
    request(app.getHttpServer())
      .get(api('/masters/landing-stats'))
      .expect(200));

  it('GET /masters/popular returns list', () =>
    request(app.getHttpServer()).get(api('/masters/popular')).expect(200));

  it('GET /masters/new returns list', () =>
    request(app.getHttpServer()).get(api('/masters/new')).expect(200));

  it('GET /masters/profile/me requires auth', () =>
    request(app.getHttpServer()).get(api('/masters/profile/me')).expect(401));

  it('GET /masters/:slug returns master when exists', async () => {
    const listRes = await request(app.getHttpServer())
      .get(api('/masters'))
      .query({ limit: 1 });
    const body = listRes.body as unknown;
    const list = Array.isArray(body)
      ? body
      : ((body as Record<string, unknown>)?.items ??
        (body as Record<string, unknown>)?.data ??
        []);
    if (
      Array.isArray(list) &&
      list[0] &&
      typeof list[0] === 'object' &&
      'slug' in list[0]
    ) {
      const slug = (list[0] as { slug: string }).slug;
      if (slug)
        await request(app.getHttpServer())
          .get(api(`/masters/${slug}`))
          .expect(200);
    }
  });
});
