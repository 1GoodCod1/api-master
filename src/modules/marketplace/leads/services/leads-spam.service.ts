import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { RedisService } from '../../../shared/redis/redis.service';
import { RecaptchaService } from '../../../shared/utils/recaptcha.service';
import { CreateLeadDto } from '../dto/create-lead.dto';

@Injectable()
export class LeadsSpamService {
  private readonly logger = new Logger(LeadsSpamService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly recaptchaService: RecaptchaService,
  ) {}

  /**
   * Проверка защиты от спама (reCAPTCHA, Rate Limiting)
   */
  async checkProtection(dto: CreateLeadDto, ipAddress?: string) {
    try {
      const { clientPhone, masterId, recaptchaToken } = dto;

      // Проверка reCAPTCHA
      if (recaptchaToken && this.recaptchaService.isConfigured()) {
        await this.recaptchaService.verifyToken(recaptchaToken, 'create_lead');
      }

      const redis = this.redis.getClient();

      // Защита от дублей в течение 5 минут
      const recentLeadKey = `lead:${clientPhone}:${masterId}`;
      const recentLead = await redis.get(recentLeadKey);
      if (recentLead) {
        throw AppErrors.badRequest(AppErrorMessages.SPAM_LEAD_RECENT);
      }

      // Лимит по номеру телефона: 5 лидов в час
      const rateLimitKey = `lead:rate:${clientPhone}`;
      const leadCount = await redis.incr(rateLimitKey);
      if (leadCount === 1) await redis.expire(rateLimitKey, 3600);
      if (leadCount > 5) {
        throw AppErrors.badRequest(AppErrorMessages.SPAM_LEAD_PHONE_HOURLY);
      }

      // Лимит по IP: 10 лидов в час
      if (ipAddress) {
        const ipRateLimitKey = `lead:rate:ip:${ipAddress}`;
        const ipLeadCount = await redis.incr(ipRateLimitKey);
        if (ipLeadCount === 1) await redis.expire(ipRateLimitKey, 3600);
        if (ipLeadCount > 10) {
          throw AppErrors.badRequest(AppErrorMessages.SPAM_LEAD_IP);
        }
      }

      // Устанавливаем защиту от дублей
      await redis.setex(recentLeadKey, 300, '1');
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('checkProtection failed', err);
      throw err;
    }
  }

  /**
   * Расчет оценки спама на основе контента сообщения
   */
  calculateSpamScore(dto: CreateLeadDto): number {
    let score = 0;
    const message = dto.message.toLowerCase();
    const spamKeywords = ['casino', 'gamble', 'viagra', 'lottery', 'credit'];

    spamKeywords.forEach((keyword) => {
      if (message.includes(keyword)) score += 10;
    });

    if (message.length < 5) score += 5;
    if (message.length > 500) score += 5;

    const phonePattern = /^(\+373|0)\d{8}$/;
    if (!dto.clientPhone || !phonePattern.test(dto.clientPhone)) {
      score += 10;
    }

    return score;
  }
}
