import type { ConfigService } from '@nestjs/config';

/** Минимальная длина секретов JWT (HS256 требует не менее 32 байт) */
const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Проверяет обязательные секреты для production. Завершает процесс, если что-то отсутствует или слабо.
 */
export function validateProductionSecrets(config: ConfigService): void {
  if (config.get<string>('nodeEnv', 'development') !== 'production') return;

  const access = config.get<string>('jwt.accessSecret', '');
  const refresh = config.get<string>('jwt.refreshSecret', '');
  const enc = config.get<string>('idEncryption.secret', '');
  const frontendUrl = config.get<string>('frontendUrl', '');

  const missing: string[] = [];

  if (
    !access ||
    access.includes('change-me') ||
    access.length < MIN_JWT_SECRET_LENGTH
  )
    missing.push(
      `JWT_ACCESS_SECRET (min ${MIN_JWT_SECRET_LENGTH} chars, no 'change-me')`,
    );
  if (
    !refresh ||
    refresh.includes('change-me') ||
    refresh.length < MIN_JWT_SECRET_LENGTH
  )
    missing.push(
      `JWT_REFRESH_SECRET (min ${MIN_JWT_SECRET_LENGTH} chars, no 'change-me')`,
    );
  if (!enc || enc === 'mm-secret-2024') missing.push('ID_ENCRYPTION_SECRET');
  if (!frontendUrl) missing.push('FRONTEND_URL');
  else if (!frontendUrl.startsWith('https://'))
    missing.push('FRONTEND_URL (must start with https://)');

  if (missing.length > 0) {
    console.error(
      `[FATAL] In production set secure values: ${missing.join(', ')}. Do not use defaults.`,
    );
    process.exit(1);
  }
}
