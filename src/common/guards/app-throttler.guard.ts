import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

const SKIP_PATHS = new Set([
  '/health',
  '/metrics',
  '/ping',
  '/liveness',
  '/readiness',
]);

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(AppThrottlerGuard.name);

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (SKIP_PATHS.has(req.path)) {
      return true;
    }
    return super.shouldSkip(context);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (err: unknown) {
      // Redis недоступен — пропускаем throttle, не роняем запрос 500.
      this.logger.warn(
        `Throttler storage error, skipping rate limit: ${err instanceof Error ? err.message : String(err)}`,
      );
      return true;
    }
  }
}
