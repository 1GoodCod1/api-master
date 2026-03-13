import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import Redis from 'ioredis';
import { RedisService } from '../../shared/redis/redis.service';
import * as os from 'os';
import { SystemAnalyticsResponse } from '../../shared/types/analytics.types';

type QueueStats = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
};

@Injectable()
export class AnalyticsSystemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getSystemAnalytics(): Promise<SystemAnalyticsResponse> {
    const redisClient = this.redis.getClient();

    const [totalUsers, activeUsers, redisKeys, queueStats, systemMetrics] =
      await Promise.all([
        this.prisma.user.count(),
        this.getActiveUsersCount(),
        redisClient.dbsize(),
        this.getQueueStats(redisClient),
        Promise.resolve(this.getSystemMetrics()),
      ]);

    return {
      timestamp: new Date().toISOString(),
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      redis: {
        keys: redisKeys,
        memory: await redisClient.info('memory'),
      },
      queues: queueStats,
      system: systemMetrics,
    };
  }

  private async getActiveUsersCount(): Promise<number> {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    return this.prisma.user.count({
      where: { lastLoginAt: { gte: lastHour } },
    });
  }

  private async getQueueStats(
    redisClient: Redis,
  ): Promise<Record<string, QueueStats>> {
    const queues = ['sms', 'telegram', 'email'];
    const stats: Record<string, QueueStats> = {};

    for (const queue of queues) {
      const [waiting, active, completed, failed] = await Promise.all([
        redisClient.llen(`bull:${queue}:wait`),
        redisClient.llen(`bull:${queue}:active`),
        redisClient.zcard(`bull:${queue}:completed`),
        redisClient.zcard(`bull:${queue}:failed`),
      ]);
      stats[queue] = { waiting, active, completed, failed };
    }
    return stats;
  }

  private getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      cpu: {
        loadavg: os.loadavg(),
        cores: os.cpus().length,
      },
      memory: {
        total: this.bytesToMB(totalMem),
        used: this.bytesToMB(usedMem),
        free: this.bytesToMB(freeMem),
        usage: ((usedMem / totalMem) * 100).toFixed(2),
      },
      uptime: os.uptime(),
      platform: os.platform(),
    };
  }

  private bytesToMB(bytes: number): number {
    return Math.round(bytes / 1024 / 1024);
  }
}
