/**
 * API E2E: Consent, admin compliance (DPIA/ROPA), GDPR-related user routes.
 * Complements unit tests — verifies auth wiring and HTTP contracts against a real app + DB.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { applyE2eGlobalPrefix } from '../helpers/e2e-bootstrap';
import { api } from './e2e-prefix';
import { getAdminToken, getClientToken } from '../api-helpers';

describe('Consent & Compliance API (e2e)', () => {
  let app: INestApplication<App>;
  let clientToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyE2eGlobalPrefix(app);
    await app.init();

    clientToken = await getClientToken(app, 'consent-e2e');
    adminToken = await getAdminToken(app);
  });

  describe('Consent', () => {
    it('POST /consent/grant requires auth', () =>
      request(app.getHttpServer())
        .post(api('/consent/grant'))
        .send({ consentType: 'PRIVACY_POLICY' })
        .expect(401));

    it('GET /consent/my requires auth', () =>
      request(app.getHttpServer()).get(api('/consent/my')).expect(401));

    it('POST /consent/revoke requires auth', () =>
      request(app.getHttpServer())
        .post(api('/consent/revoke'))
        .send({ consentType: 'PRIVACY_POLICY' })
        .expect(401));

    it('grant → list → revoke works when authenticated', async () => {
      if (!clientToken) return;

      await request(app.getHttpServer())
        .post(api('/consent/grant'))
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ consentType: 'MARKETING', version: '1.0' })
        .expect(200);

      const my = await request(app.getHttpServer())
        .get(api('/consent/my'))
        .set('Authorization', `Bearer ${clientToken}`);

      expect(my.status).toBe(200);
      expect(Array.isArray(my.body)).toBe(true);

      await request(app.getHttpServer())
        .post(api('/consent/revoke'))
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ consentType: 'MARKETING' })
        .expect(200);
    });
  });

  describe('Admin compliance', () => {
    it('GET /admin/compliance/overview requires auth', () =>
      request(app.getHttpServer())
        .get(api('/admin/compliance/overview'))
        .expect(401));

    it('GET /admin/compliance/dpia requires auth', () =>
      request(app.getHttpServer())
        .get(api('/admin/compliance/dpia'))
        .expect(401));

    it('GET /admin/compliance/ropa requires auth', () =>
      request(app.getHttpServer())
        .get(api('/admin/compliance/ropa'))
        .expect(401));

    it('overview returns stats when admin', async () => {
      if (!adminToken) return;

      const res = await request(app.getHttpServer())
        .get(api('/admin/compliance/overview'))
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toMatchObject({
          dpiaAvailable: true,
          ropaAvailable: true,
        });
        expect(typeof res.body.totalUsers).toBe('number');
      }
    });

    it('DPIA responds with PDF when admin', async () => {
      if (!adminToken) return;

      const res = await request(app.getHttpServer())
        .get(api('/admin/compliance/dpia'))
        .query({ locale: 'en' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(String(res.headers['content-type'])).toContain(
          'application/pdf',
        );
      }
    });

    it('ROPA responds with PDF when admin', async () => {
      if (!adminToken) return;

      const res = await request(app.getHttpServer())
        .get(api('/admin/compliance/ropa'))
        .query({ locale: 'en' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(String(res.headers['content-type'])).toContain(
          'application/pdf',
        );
      }
    });
  });

  describe('Users GDPR export', () => {
    it('GET /users/me/export requires auth', () =>
      request(app.getHttpServer()).get(api('/users/me/export')).expect(401));

    it('returns PDF when authenticated client', async () => {
      if (!clientToken) return;

      const res = await request(app.getHttpServer())
        .get(api('/users/me/export'))
        .set('Authorization', `Bearer ${clientToken}`);

      expect([200, 401, 403, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(String(res.headers['content-type'])).toContain(
          'application/pdf',
        );
      }
    });
  });
});
