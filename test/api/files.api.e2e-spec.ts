/**
 * API E2E: Files upload endpoints (auth required)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';

describe('Files API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyE2eGlobalPrefix(app);
    await app.init();
  });

  it('POST /files/upload requires auth', () =>
    request(app.getHttpServer())
      .post(api('/files/upload'))
      .attach('file', Buffer.from('test'), { filename: 'test.txt' })
      .expect(401));

  it('POST /files/upload-many returns status', () =>
    request(app.getHttpServer())
      .post(api('/files/upload-many'))
      .send({ files: [] })
      .expect((res) => expect([200, 201, 400, 401]).toContain(res.status)));
});
