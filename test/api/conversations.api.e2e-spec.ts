/**
 * API E2E: Conversations (chat) endpoints (auth required)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { getClientToken } from '../api-helpers';

describe('Conversations API (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    token = await getClientToken(app, 'chat');
  });

  it('GET /conversations requires auth', () =>
    request(app.getHttpServer()).get('/conversations').expect(401));

  it('GET /conversations returns list when authenticated', () =>
    request(app.getHttpServer())
      .get('/conversations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200));

  it('GET /conversations/unread-count returns count when authenticated', () =>
    request(app.getHttpServer())
      .get('/conversations/unread-count')
      .set('Authorization', `Bearer ${token}`)
      .expect(200));
});
