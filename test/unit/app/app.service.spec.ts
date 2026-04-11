import { Logger } from '@nestjs/common';
import { AppService } from '../../../src/app/app.service';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { RedisService } from '../../../src/modules/shared/redis/redis.service';

describe('AppService', () => {
  const configService = {
    get: jest.fn((key: string, def?: string) => {
      if (key === 'npm_package_version') return '9.9.9';
      if (key === 'NODE_ENV') return 'test';
      if (key === 'buildId') return 'build-1';
      return def;
    }),
  };

  const prisma = {
    $queryRaw: jest.fn(),
  };

  const redisClient = {
    ping: jest.fn(),
    info: jest.fn(),
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const redis = {
    getClient: () => redisClient,
  };

  let service: AppService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$queryRaw
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ count: BigInt(4) }]);
    redisClient.ping.mockResolvedValue('PONG');
    redisClient.info.mockResolvedValue('connected_clients:2\r\n');
    redisClient.setex.mockResolvedValue('OK');
    redisClient.get.mockResolvedValue('test_value');
    redisClient.del.mockResolvedValue(1);
    service = new AppService(
      configService as unknown as ConfigService,
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );
  });

  it('getVersion returns name, version, build', () => {
    expect(service.getVersion()).toEqual({
      name: 'faber.md API',
      version: '9.9.9',
      build: 'build-1',
    });
  });

  it('getHealth is healthy when all dependency checks succeed', async () => {
    const h = await service.getHealth();
    expect(h.status).toBe('healthy');
    expect(h.timestamp).toEqual(expect.any(String));
  });

  it('getStatus returns 200 and success when all services up', async () => {
    const s = await service.getStatus();
    expect(s.success).toBe(true);
    expect(s.code).toBe(200);
    expect(s.message).toBe('All systems operational');
    expect(s.version).toBe('9.9.9');
    expect(s.environment).toBe('test');
    expect(s.uptime).toBeGreaterThanOrEqual(0);
    expect(s.services.every((x) => x.status === 'up')).toBe(true);
  });

  it('getStatus returns 503 when database check fails', async () => {
    const errLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    try {
      prisma.$queryRaw.mockReset();
      prisma.$queryRaw.mockRejectedValue(new Error('db down'));
      redisClient.ping.mockResolvedValue('PONG');
      redisClient.info.mockResolvedValue('');
      redisClient.setex.mockResolvedValue('OK');
      redisClient.get.mockResolvedValue('test_value');
      redisClient.del.mockResolvedValue(1);

      const s = await service.getStatus();
      expect(s.success).toBe(false);
      expect(s.code).toBe(503);
      expect(s.services.find((x) => x.name === 'Database')?.status).toBe(
        'down',
      );
    } finally {
      errLog.mockRestore();
    }
  });

  it('getStatus returns 206 when Redis is degraded (unexpected ping)', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ count: BigInt(1) }]);
    redisClient.ping.mockResolvedValue('WEIRD');
    redisClient.info.mockResolvedValue('');
    redisClient.setex.mockResolvedValue('OK');
    redisClient.get.mockResolvedValue('test_value');
    redisClient.del.mockResolvedValue(1);

    const s = await service.getStatus();
    expect(s.code).toBe(206);
    expect(s.success).toBe(true);
    expect(s.message).toBe('Systems partially operational');
    expect(s.services.find((x) => x.name === 'Redis')?.status).toBe('degraded');
  });
});
