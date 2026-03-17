import type { ConfigService } from '@nestjs/config';

/**
 * Validates required production secrets. Exits process if any are missing.
 */
export function validateProductionSecrets(config: ConfigService): void {
  if (config.get<string>('nodeEnv', 'development') !== 'production') return;

  const access = config.get<string>('jwt.accessSecret', '');
  const refresh = config.get<string>('jwt.refreshSecret', '');
  const enc = config.get<string>('idEncryption.secret', '');
  const frontendUrl = config.get<string>('frontendUrl', '');

  const bad =
    !access ||
    access.includes('change-me') ||
    !refresh ||
    refresh.includes('change-me') ||
    !enc ||
    enc === 'mm-secret-2024' ||
    !frontendUrl;

  if (bad) {
    const missing: string[] = [];
    if (!access || access.includes('change-me'))
      missing.push('JWT_ACCESS_SECRET');
    if (!refresh || refresh.includes('change-me'))
      missing.push('JWT_REFRESH_SECRET');
    if (!enc || enc === 'mm-secret-2024') missing.push('ID_ENCRYPTION_SECRET');
    if (!frontendUrl) missing.push('FRONTEND_URL');
    console.error(
      `[FATAL] In production set secure values: ${missing.join(', ')}. Do not use defaults.`,
    );
    process.exit(1);
  }
}
