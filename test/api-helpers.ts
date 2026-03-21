/**
 * Shared helpers for API E2E tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { api } from './api/e2e-prefix';

export async function getMasterId(app: INestApplication<App>): Promise<string> {
  const res = await request(app.getHttpServer())
    .get(api('/masters'))
    .query({ limit: 1 });
  const body = res.body as unknown;
  const masters: unknown = Array.isArray(body)
    ? body
    : ((body as Record<string, unknown>).items ??
      (body as Record<string, unknown>).data ??
      body);
  const first: unknown =
    Array.isArray(masters) && masters[0] ? masters[0] : null;
  if (first && typeof first === 'object' && 'id' in first) {
    const id = (first as { id: unknown }).id;
    return typeof id === 'string' ? id : '';
  }
  return '';
}

export async function getClientToken(
  app: INestApplication<App>,
  prefix = 'api',
): Promise<string> {
  const ts = Date.now();
  const email = `${prefix}-${ts}@test.local`;
  const phone = `+37360${String(ts).slice(-7)}`;
  await request(app.getHttpServer()).post(api('/auth/register')).send({
    email,
    phone,
    password: 'TestPass1!@#',
    firstName: 'T',
    lastName: 'U',
    role: 'CLIENT',
  });
  const loginRes = await request(app.getHttpServer())
    .post(api('/auth/login'))
    .send({ email, password: 'TestPass1!@#' });
  const body = loginRes.body as Record<string, unknown>;
  return typeof body.accessToken === 'string' ? body.accessToken : '';
}

export async function getAdminToken(
  app: INestApplication<App>,
): Promise<string> {
  const ts = Date.now();
  const email = `admin-${ts}@test.local`;
  const phone = `+37360${String(ts).slice(-7)}`;
  await request(app.getHttpServer()).post(api('/auth/register')).send({
    email,
    phone,
    password: 'TestPass1!@#',
    firstName: 'A',
    lastName: 'D',
    role: 'ADMIN',
  });
  const loginRes = await request(app.getHttpServer())
    .post(api('/auth/login'))
    .send({ email, password: 'TestPass1!@#' });
  const body = loginRes.body as Record<string, unknown>;
  return typeof body.accessToken === 'string' ? body.accessToken : '';
}
