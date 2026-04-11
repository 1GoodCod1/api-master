import { ValidationPipe, type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { applyGlobalPrefix } from '../../src/config/http-app';

/**
 * Align e2e app with production `main.ts`: global prefix, cookies (OAuth),
 * and ValidationPipe so DTO rules (e.g. CompleteOAuthDto phone) apply.
 */
export function applyE2eGlobalPrefix(app: INestApplication): void {
  applyGlobalPrefix(app);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
