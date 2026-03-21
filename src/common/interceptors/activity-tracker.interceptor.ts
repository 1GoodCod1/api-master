import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../modules/shared/database/prisma.service';
import { RedisService } from '../../modules/shared/redis/redis.service';
import type { RequestWithOptionalUser } from '../decorators/get-user.decorator';

/**
 * After JwtAuthGuard runs, updates lastActivityAt for masters with Redis debouncing
 * (at most one DB write per DEBOUNCE_SECONDS per master).
 */
const DEBOUNCE_SECONDS = 5 * 60;
const REDIS_KEY_PREFIX = 'activity:debounce:';

@Injectable()
export class ActivityTrackerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityTrackerInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithOptionalUser>();

    if (req.user?.role === 'MASTER') {
      this.debouncedActivityUpdate(req.user.id).catch(() => {});
    }

    return next.handle();
  }

  private async debouncedActivityUpdate(userId: string): Promise<void> {
    try {
      const redisKey = `${REDIS_KEY_PREFIX}${userId}`;

      const result = await this.redis
        .getClient()
        .set(redisKey, '1', 'EX', DEBOUNCE_SECONDS, 'NX');

      if (result !== 'OK') {
        return;
      }

      await this.updateLastActivity(userId);
    } catch {
      this.logger.debug(`Activity debounce check failed for user ${userId}`);
    }
  }

  private async updateLastActivity(userId: string): Promise<void> {
    try {
      const { count } = await this.prisma.master.updateMany({
        where: { userId },
        data: { lastActivityAt: new Date() },
      });

      if (count === 0) {
        return;
      }

      const master = await this.prisma.master.findFirst({
        where: { userId },
        select: { id: true, isOnline: true },
      });

      if (master && !master.isOnline) {
        await this.redis.del(`master:inactive:${master.id}`);
        await this.redis.del(`master:warning:${master.id}`);
      }
    } catch {
      this.logger.warn(`Failed to update master activity for user ${userId}`);
    }
  }
}
