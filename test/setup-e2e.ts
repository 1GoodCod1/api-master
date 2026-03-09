/**
 * E2E test setup — loads .env then sets required env vars if not already set.
 * CI sets these via workflow; locally uses .env or defaults.
 */
import 'dotenv/config';

process.env.NODE_ENV = 'test';
// Disable read replicas in tests to reduce connection count
process.env.DATABASE_READ_URL = '';

if (!process.env.ID_ENCRYPTION_SECRET) {
  process.env.ID_ENCRYPTION_SECRET = 'test-encryption-secret-32chars!!';
}
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-min-32-chars';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars';
}
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://postgres:password@localhost:5432/project3';
}
if (!process.env.REDIS_HOST) {
  process.env.REDIS_HOST = 'localhost';
}
if (!process.env.REDIS_PORT) {
  process.env.REDIS_PORT = '6379';
}
