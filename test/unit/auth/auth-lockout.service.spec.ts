import { ForbiddenException } from '@nestjs/common';
import { AUTH_LOCKOUT_THRESHOLD } from '../../../src/common/constants';
import { AuthLockoutService } from '../../../src/modules/auth/auth/services/auth-lockout.service';
import type { RedisService } from '../../../src/modules/shared/redis/redis.service';

describe('AuthLockoutService', () => {
  const redisClient = {
    get: jest.fn(),
    incr: jest.fn(),
  };

  const redis = {
    getClient: () => redisClient,
    expire: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  let service: AuthLockoutService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthLockoutService(redis as unknown as RedisService);
  });

  describe('checkLocked', () => {
    it('resolves when email attempt count is below threshold', async () => {
      redisClient.get.mockResolvedValueOnce(String(AUTH_LOCKOUT_THRESHOLD - 1));
      await expect(
        service.checkLocked('User@Example.com'),
      ).resolves.toBeUndefined();
      expect(redisClient.get).toHaveBeenCalledWith(
        'auth:lockout:email:user@example.com',
      );
    });

    it('throws ForbiddenException when email is at threshold', async () => {
      redisClient.get.mockResolvedValueOnce(String(AUTH_LOCKOUT_THRESHOLD));
      await expect(service.checkLocked('a@b.com')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws when IP attempts reach threshold * 2', async () => {
      redisClient.get
        .mockResolvedValueOnce('0')
        .mockResolvedValueOnce(String(AUTH_LOCKOUT_THRESHOLD * 2));
      await expect(
        service.checkLocked('a@b.com', ' 10.0.0.1 '),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(redisClient.get).toHaveBeenNthCalledWith(
        2,
        'auth:lockout:ip:10.0.0.1',
      );
    });

    it('skips IP check when ipAddress omitted', async () => {
      redisClient.get.mockResolvedValueOnce('0');
      await expect(service.checkLocked('a@b.com')).resolves.toBeUndefined();
      expect(redisClient.get).toHaveBeenCalledTimes(1);
    });

    it('rethrows ForbiddenException from redis path', async () => {
      redisClient.get.mockResolvedValueOnce(String(AUTH_LOCKOUT_THRESHOLD));
      await expect(service.checkLocked('x@y.z')).rejects.toMatchObject({
        status: 403,
      });
    });
  });

  describe('recordFailed', () => {
    it('increments email key and sets TTL on first failure', async () => {
      redisClient.incr.mockResolvedValueOnce(1);
      await service.recordFailed('a@b.com', '1.1.1.1');
      expect(redisClient.incr).toHaveBeenCalledWith(
        'auth:lockout:email:a@b.com',
      );
      expect(redis.expire).toHaveBeenCalledWith(
        'auth:lockout:email:a@b.com',
        expect.any(Number),
      );
    });

    it('increments only IP when email omitted', async () => {
      redisClient.incr.mockResolvedValueOnce(1);
      await service.recordFailed(undefined, '2.2.2.2');
      expect(redisClient.incr).toHaveBeenCalledTimes(1);
      expect(redisClient.incr).toHaveBeenCalledWith('auth:lockout:ip:2.2.2.2');
    });
  });

  describe('clearLockout', () => {
    it('deletes email and IP keys', async () => {
      await service.clearLockout('a@b.com', '3.3.3.3');
      expect(redis.del).toHaveBeenCalledWith('auth:lockout:email:a@b.com');
      expect(redis.del).toHaveBeenCalledWith('auth:lockout:ip:3.3.3.3');
    });
  });
});
