/**
 * Shared helpers for API E2E tests
 */
import { randomInt } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { api } from './api/e2e-prefix';

/** +373 + exactly 8 digits — matches RegisterDto Moldovan phone regex. */
export function uniqueMoldovanPhone(): string {
  return `+373${String(randomInt(10_000_000, 99_999_999))}`;
}

/** Required by RegisterDto (age + legal consent) for e2e registration payloads. */
export const e2eRegistrationConsent = {
  acceptedAge: true,
  acceptedLegal: true,
} as const;

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
  const phone = uniqueMoldovanPhone();
  await request(app.getHttpServer())
    .post(api('/auth/register'))
    .send({
      email,
      phone,
      password: 'TestPass1!@#',
      firstName: 'T',
      lastName: 'U',
      role: 'CLIENT',
      ...e2eRegistrationConsent,
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
  const phone = uniqueMoldovanPhone();
  await request(app.getHttpServer())
    .post(api('/auth/register'))
    .send({
      email,
      phone,
      password: 'TestPass1!@#',
      firstName: 'A',
      lastName: 'D',
      role: 'ADMIN',
      ...e2eRegistrationConsent,
    });
  const loginRes = await request(app.getHttpServer())
    .post(api('/auth/login'))
    .send({ email, password: 'TestPass1!@#' });
  const body = loginRes.body as Record<string, unknown>;
  return typeof body.accessToken === 'string' ? body.accessToken : '';
}
