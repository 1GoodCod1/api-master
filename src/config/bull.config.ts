import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

export function createBullOptions(configService: ConfigService) {
  const sentinels =
    configService.get<{ host: string; port: number }[]>('redis.sentinels');
  const name = configService.get<string>('redis.sentinelName', 'mymaster');
  const password = configService.get<string>('redis.password', '');

  const redisOptions: RedisOptions = {
    password,
    connectTimeout: 10000,
    lazyConnect: true,
    retryStrategy: (times: number) => {
      if (times > 10) return null;
      return Math.min(times * 50, 2000);
    },
  };

  if (sentinels && sentinels.length > 0) {
    redisOptions.sentinels = sentinels;
    redisOptions.name = name;
    redisOptions.sentinelPassword = password;
  } else {
    redisOptions.host = configService.get<string>('redis.host', 'localhost');
    redisOptions.port = configService.get<number>('redis.port', 6379);
  }

  return {
    redis: redisOptions,
    defaultJobOptions: {
      removeOnComplete: true,
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 1000,
      },
    },
  };
}
