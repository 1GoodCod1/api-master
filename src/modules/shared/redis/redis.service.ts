import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private isDestroyed = false;

  constructor(private configService: ConfigService) {
    const sentinels =
      this.configService.get<{ host: string; port: number }[]>(
        'redis.sentinels',
      );
    const name = this.configService.get<string>(
      'redis.sentinelName',
      'mymaster',
    );
    const password = this.configService.get<string>('redis.password', '');

    const options: RedisOptions = {
      password,
      connectTimeout: 10000,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: (times: number) => {
        if (times > 10) {
          this.logger.error('Redis retry limit exceeded');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    if (sentinels && sentinels.length > 0) {
      options.sentinels = sentinels;
      options.name = name;
      options.sentinelPassword = password;
    } else {
      options.host = this.configService.get<string>('redis.host', 'localhost');
      options.port = this.configService.get<number>('redis.port', 6379);
    }

    this.client = new Redis(options);

    this.client.on('error', (err: Error & { code?: string }) => {
      if (this.isDestroyed || err?.code === 'EPIPE') {
        return;
      }
      this.logger.error('Redis connection error', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis is ready to accept commands');
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis reconnecting...');
    });
  }

  async onModuleInit() {
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Redis connection timeout')),
          10000,
        );
      });
      await Promise.race([this.client.ping(), timeoutPromise]);
      this.logger.log('Redis connection initiated and verified');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Redis connection failed: ${msg}`);
      this.logger.warn(
        'Application will continue without Redis. Some features may be unavailable.',
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  getClient(): Redis {
    return this.client;
  }

  isAvailable(): boolean {
    return (
      !this.isDestroyed &&
      (this.client?.status === 'ready' || this.client?.status === 'connect')
    );
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const stringValue =
        typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl) {
        await this.client.setex(key, ttl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Redis set failed for key ${key}:`, msg);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);

      if (!value) return null;

      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Redis get failed for key ${key}:`, msg);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Redis del failed for key ${key}:`, msg);
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Redis incr failed for key ${key}:`, msg);
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.client.expire(key, ttl);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Redis expire failed for key ${key}:`, msg);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Redis keys failed for pattern ${pattern}:`, msg);
      return [];
    }
  }

  async hset(key: string, field: string, value: any): Promise<void> {
    try {
      const stringValue =
        typeof value === 'string' ? value : JSON.stringify(value);
      await this.client.hset(key, field, stringValue);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Redis hset failed for key ${key}, field ${field}:`,
        msg,
      );
    }
  }

  async hget<T = any>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.client.hget(key, field);

      if (!value) return null;

      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Redis hget failed for key ${key}, field ${field}:`,
        msg,
      );
      return null;
    }
  }

  async onModuleDestroy() {
    this.isDestroyed = true;
    try {
      this.client.removeAllListeners();
      await this.client.quit().catch(() => {});
    } catch {
      this.logger.debug('Redis connection closed');
    }
  }
}
