import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/** Пути которые не должны throttle-иться никогда (infra/monitoring). */
const SKIP_PATHS = new Set([
  '/health',
  '/metrics',
  '/ping',
  '/liveness',
  '/readiness',
]);

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (SKIP_PATHS.has(req.path)) {
      return true;
    }
    return super.shouldSkip(context);
  }
}
