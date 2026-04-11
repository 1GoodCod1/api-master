import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.DATABASE_READ_URL = '';

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
    // Outside Docker: replace internal hostname with localhost (port is exposed by docker-compose)
    process.env.DATABASE_URL =
      'postgresql://postgres:bacardi@127.0.0.1:5432/project3';
  } else if (!url) {
    process.env.DATABASE_URL =
      'postgresql://postgres:bacardi@127.0.0.1:5432/project3';
  }
}

function resolveE2eRedis(): void {
  if (process.env.TEST_USE_SENTINEL_REDIS === 'true') return;

  process.env.REDIS_SENTINELS = '';

  // If REDIS_HOST still points to a Docker-internal name, redirect to localhost
  const redisHost = process.env.REDIS_HOST || '';
  if (!redisHost || redisHost === 'redis' || redisHost.includes('sentinel')) {
    process.env.REDIS_HOST = '127.0.0.1';
  }

  if (!process.env.REDIS_PORT) {
    process.env.REDIS_PORT = '6379';
  }
}

resolveE2eDatabaseUrl();
resolveE2eRedis();

if (!process.env.ID_ENCRYPTION_SECRET) {
  process.env.ID_ENCRYPTION_SECRET = 'test-encryption-secret-32chars!!';
}
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-min-32-chars';
}
if (!process.env.JWT_OAUTH_PENDING_SECRET) {
  process.env.JWT_OAUTH_PENDING_SECRET =
    'test-jwt-oauth-pending-secret-min-32-chars';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars';
}
