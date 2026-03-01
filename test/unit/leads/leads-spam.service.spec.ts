import { BadRequestException } from '@nestjs/common';
import { LeadsSpamService } from '../../../src/modules/leads/services/leads-spam.service';
import type { RedisService } from '../../../src/modules/shared/redis/redis.service';
import type { RecaptchaService } from '../../../src/modules/shared/utils/recaptcha.service';

describe('LeadsSpamService', () => {
  const redisClient = {
    get: jest.fn(),
    setex: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  };

  const redis = {
    getClient: jest.fn(() => redisClient),
  } as unknown as jest.Mocked<RedisService>;

  const recaptchaService = {
    isConfigured: jest.fn(() => false),
    verifyToken: jest.fn(),
  } as unknown as jest.Mocked<RecaptchaService>;

  let service: LeadsSpamService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeadsSpamService(redis, recaptchaService);
  });

  describe('checkProtection', () => {
    it('throws BadRequestException when recent lead exists', async () => {
      redisClient.get.mockResolvedValue('1');

      await expect(
        service.checkProtection(
          { clientPhone: '+37312345678', masterId: 'm1' } as never,
          '127.0.0.1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when phone rate limit exceeded', async () => {
      redisClient.get.mockResolvedValue(null);
      redisClient.incr.mockResolvedValue(6);

      await expect(
        service.checkProtection(
          { clientPhone: '+37312345678', masterId: 'm1' } as never,
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when IP rate limit exceeded', async () => {
      redisClient.get.mockResolvedValue(null);
      redisClient.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(11);

      await expect(
        service.checkProtection(
          { clientPhone: '+37312345678', masterId: 'm1' } as never,
          '192.168.1.1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('passes when limits are not exceeded', async () => {
      redisClient.get.mockResolvedValue(null);
      redisClient.incr.mockResolvedValue(1);

      await service.checkProtection(
        { clientPhone: '+37312345678', masterId: 'm1' } as never,
        '192.168.1.1',
      );

      expect(redisClient.setex).toHaveBeenCalledWith(
        'lead:+37312345678:m1',
        300,
        '1',
      );
    });
  });

  describe('calculateSpamScore', () => {
    it('returns 0 for clean message with valid phone', () => {
      const score = service.calculateSpamScore({
        clientPhone: '+37312345678',
        masterId: 'm1',
        message: 'Hello, I need your services',
      } as never);

      expect(score).toBe(0);
    });

    it('adds score for spam keywords', () => {
      const score = service.calculateSpamScore({
        clientPhone: '+37312345678',
        masterId: 'm1',
        message: 'Check out our casino and viagra',
      } as never);

      expect(score).toBeGreaterThan(0);
    });

    it('adds score for very short message', () => {
      const score = service.calculateSpamScore({
        clientPhone: '+37312345678',
        masterId: 'm1',
        message: 'Hi',
      } as never);

      expect(score).toBe(5);
    });

    it('adds score for invalid phone', () => {
      const score = service.calculateSpamScore({
        clientPhone: 'invalid',
        masterId: 'm1',
        message: 'Valid message here',
      } as never);

      expect(score).toBe(10);
    });
  });
});
