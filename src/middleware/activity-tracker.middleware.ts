import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../modules/shared/database/prisma.service';
import { RedisService } from '../modules/shared/redis/redis.service';
import type { RequestWithOptionalUser } from '../common/decorators/get-user.decorator';

/**
 * Middleware для автоматического обновления lastActivityAt для мастеров
 * Обновляет время последней активности при любых запросах от авторизованного мастера
 * И реактивирует деактивированных мастеров
 */
@Injectable()
export class ActivityTrackerMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const user = (req as RequestWithOptionalUser).user;

    if (user && user.role === 'MASTER') {
      this.updateLastActivity(user.id).catch(() => {});
    }

    next();
  }

  private async updateLastActivity(userId: string): Promise<void> {
    try {
      const master = await this.prisma.master.findFirst({
        where: { userId },
        select: { id: true, isOnline: true },
      });

      if (!master) {
        return;
      }

      // Обновляем только lastActivityAt. isOnline меняется только явно через updateOnlineStatus.
      await this.prisma.master.update({
        where: { id: master.id },
        data: {
          lastActivityAt: new Date(),
        },
      });

      // Если мастер был деактивирован, очищаем кэш предупреждений
      if (!master.isOnline) {
        await this.redis.del(`master:inactive:${master.id}`);
        await this.redis.del(`master:warning:${master.id}`);
      }
    } catch (error) {
      console.error('Failed to update master activity:', error);
    }
  }
}
