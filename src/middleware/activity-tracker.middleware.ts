import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../modules/shared/database/prisma.service';
import { RedisService } from '../modules/shared/redis/redis.service';
import type { RequestWithOptionalUser } from '../common/decorators/get-user.decorator';

/**
 * Middleware for automatic lastActivityAt updates for masters.
 *
 * Uses Redis-based debouncing: the DB is written to at most once every
 * DEBOUNCE_SECONDS (5 min) per master, instead of on every HTTP request.
 * This reduces DB load from ~2000 queries/min (100 active masters × 10 req/min × 2 queries)
 * to ~20 queries/min — a 100× reduction.
 */
const DEBOUNCE_SECONDS = 5 * 60; // 5 minutes
const REDIS_KEY_PREFIX = 'activity:debounce:';

@Injectable()
export class ActivityTrackerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ActivityTrackerMiddleware.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const user = (req as RequestWithOptionalUser).user;

    if (user?.role === 'MASTER') {
      this.debouncedActivityUpdate(user.id).catch(() => {});
    }

    next();
  }

  /**
   * Redis-debounced activity update.
   * Uses SET NX (set-if-not-exists) with a TTL so that only the first
   * request in every 5-minute window triggers a DB write.
   */
  private async debouncedActivityUpdate(userId: string): Promise<void> {
    try {
      const redisKey = `${REDIS_KEY_PREFIX}${userId}`;

      // SET NX: returns 'OK' only if the key did not already exist.
      // If the key exists, another request already updated within the window — skip DB.
      const result = await this.redis
        .getClient()
        .set(redisKey, '1', 'EX', DEBOUNCE_SECONDS, 'NX');

      if (result !== 'OK') {
        // Key already existed — we updated recently, skip DB write.
        return;
      }

      // First request in this 5-minute window — write to Postgres.
      await this.updateLastActivity(userId);
    } catch {
      // Redis down? Fall through silently — activity tracking is non-critical.
      this.logger.debug(`Activity debounce check failed for user ${userId}`);
    }
  }

  private async updateLastActivity(userId: string): Promise<void> {
    try {
      // Use updateMany to avoid the extra findFirst round-trip.
      // The userId column has a @unique index, so this updates at most 1 row.
      const { count } = await this.prisma.master.updateMany({
        where: { userId },
        data: { lastActivityAt: new Date() },
      });

      if (count === 0) {
        return;
      }

      // If the master was previously offline, clear inactivity warning caches.
      // This is a rare path — only runs when master comes back from offline.
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
