/**
 * E2E test setup — loads .env then aligns env for Jest on the host machine.
 * CI sets DATABASE_URL/REDIS_* via workflow; local `.env` often targets Docker hostnames.
 */
import 'dotenv/config';

process.env.NODE_ENV = 'test';
// Disable read replicas in tests to reduce connection count
process.env.DATABASE_READ_URL = '';

/**
 * Локальный `.env` с продакшена задаёт `postgres` / `pgbouncer` — на хосте при `npm run test:api` не резолвятся.
 * CI передаёт `postgresql://...@localhost:5432/test_db` — не трогаем.
 */
function resolveE2eDatabaseUrl(): void {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    return;
  }
  const url = process.env.DATABASE_URL || '';
  const isDockerInternalHost =
    /@(postgres|pgbouncer)(:\d+)?\//.test(url) ||
    url.includes('@fabermd-postgres');

  if (isDockerInternalHost) {
    process.env.DATABASE_URL =
      'postgresql://postgres:bacardi@127.0.0.1:5432/project3';
  } else if (!url) {
    process.env.DATABASE_URL =
      'postgresql://postgres:bacardi@127.0.0.1:5432/project3';
  }
}

resolveE2eDatabaseUrl();

/**
 * Sentinel-хосты из `.env` (redis-sentinel-1:26379, …) недоступны с хоста; e2e используют один Redis (CI / docker-compose.dev).
 */
if (process.env.TEST_USE_SENTINEL_REDIS !== 'true') {
  process.env.REDIS_SENTINELS = '';
}

if (!process.env.ID_ENCRYPTION_SECRET) {
  process.env.ID_ENCRYPTION_SECRET = 'test-encryption-secret-32chars!!';
}
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-min-32-chars';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars';
}
if (!process.env.REDIS_HOST) {
  process.env.REDIS_HOST = 'localhost';
}
if (!process.env.REDIS_PORT) {
  process.env.REDIS_PORT = '6379';
}
