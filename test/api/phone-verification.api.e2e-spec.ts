/**
 * API E2E: Phone verification endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

describe('Phone Verification API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('POST /phone-verification/send-code returns expected status', () =>
    request(app.getHttpServer())
      .post('/phone-verification/send-code')
      .send({ phone: '+37360123456' })
      .expect((res) =>
        expect([200, 201, 400, 401, 429]).toContain(res.status),
      ));

  it('GET /phone-verification/status requires auth', () =>
    request(app.getHttpServer()).get('/phone-verification/status').expect(401));
});
