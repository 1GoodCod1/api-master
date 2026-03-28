import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../modules/shared/database/prisma.service';
import { RedisService } from '../modules/shared/redis/redis.service';
import type { AppStatus, ServiceStatus } from './types';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getStatus(): Promise<AppStatus> {
    const services = await this.checkServices();
    const allUp = services.every((s) => s.status === 'up');
    const hasDegraded = services.some((s) => s.status === 'degraded');

    let code: number;
    let success: boolean;
    let message: string;

    if (allUp) {
      code = 200;
      success = true;
      message = 'All systems operational';
    } else if (hasDegraded) {
      code = 206;
      success = true;
      message = 'Systems partially operational';
    } else {
      code = 503;
      success = false;
      message = 'Service unavailable';
    }

    return {
      success,
      code,
      message,
      timestamp: new Date().toISOString(),
      version: this.configService.get('npm_package_version') || '1.0.0',
      environment: this.configService.get('NODE_ENV') || 'development',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services,
    };
  }

  async getHealth(): Promise<{ status: string; timestamp: string }> {
    const services = await this.checkServices();
    const allUp = services.every((s) => s.status === 'up');

    return {
      status: allUp ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }

  getVersion(): {
    version: string;
    build: string;
    name: string;
  } {
    return {
      name: 'Master-Hub API',
      version: this.configService.get('npm_package_version') || '1.0.0',
      build: this.configService.get<string>('buildId', 'local'),
    };
  }

  private async checkServices(): Promise<ServiceStatus[]> {
    const checks = [
      this.checkApi(),
      this.checkDatabase(),
      this.checkRedis(),
      this.checkCache(),
    ];

    const results = await Promise.allSettled(checks);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const serviceNames = ['API', 'Database', 'Redis', 'Cache'];
        const message =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason ?? 'Check failed');
        return {
          name: serviceNames[index] || 'Unknown',
          status: 'down',
          message,
        };
      }
    });
  }

  private checkApi(): Promise<ServiceStatus> {
    const start = Date.now();

    try {
      return Promise.resolve({
        name: 'API',
        status: 'up',
        responseTime: Date.now() - start,
        message: 'API server is responding',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Check failed';
      return Promise.resolve({ name: 'API', status: 'down', message });
    }
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    const start = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      const tableCount = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;

      return {
        name: 'Database',
        status: 'up',
        responseTime: Date.now() - start,
        message: `PostgreSQL connected (${tableCount[0]?.count || 0} tables)`,
      };
    } catch (error: unknown) {
      this.logger.error('Database health check failed:', error);
      const message = error instanceof Error ? error.message : 'Check failed';
      return { name: 'Database', status: 'down', message };
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    const start = Date.now();

    try {
      const redis = this.redis.getClient();
      const pong = await redis.ping();

      if (pong === 'PONG') {
        const info = await redis.info();
        const connectedClients =
          info.match(/connected_clients:(\d+)/)?.[1] || '0';

        return {
          name: 'Redis',
          status: 'up',
          responseTime: Date.now() - start,
          message: `Redis connected (${connectedClients} clients)`,
        };
      } else {
        return {
          name: 'Redis',
          status: 'degraded',
          message: 'Redis responded with unexpected message',
        };
      }
    } catch (error: unknown) {
      this.logger.error('Redis health check failed:', error);
      const message = error instanceof Error ? error.message : 'Check failed';
      return { name: 'Redis', status: 'down', message };
    }
  }

  private async checkCache(): Promise<ServiceStatus> {
    const start = Date.now();
    const testKey = 'health_check_' + Date.now();
    const testValue = 'test_value';

    try {
      const redis = this.redis.getClient();

      await redis.setex(testKey, 10, testValue);

      const retrievedValue = await redis.get(testKey);

      await redis.del(testKey);

      if (retrievedValue === testValue) {
        return {
          name: 'Cache',
          status: 'up',
          responseTime: Date.now() - start,
          message: 'Cache read/write operations successful',
        };
      } else {
        return {
          name: 'Cache',
          status: 'degraded',
          message: 'Cache returned unexpected value',
        };
      }
    } catch (error: unknown) {
      this.logger.error('Cache health check failed:', error);
      const message = error instanceof Error ? error.message : 'Check failed';
      return { name: 'Cache', status: 'down', message };
    }
  }
}
