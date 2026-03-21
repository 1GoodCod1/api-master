import type { INestApplication } from '@nestjs/common';
import { applyGlobalPrefix } from '../../src/config/http-app';

/** Align e2e HTTP routes with production `main.ts` (global prefix). */
export function applyE2eGlobalPrefix(app: INestApplication): void {
  applyGlobalPrefix(app);
}
