import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import { ConfigService } from '@nestjs/config';
import type { RecaptchaVerifyResponse } from '../types';

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly secretKey: string;
  private readonly minScore = 0.5; // Минимальный score для прохождения (0.0 - 1.0)

  constructor(private readonly configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>('RECAPTCHA_SECRET_KEY') || '';
  }

  /**
   * Верифицировать reCAPTCHA токен
   */
  async verifyToken(token: string, action?: string): Promise<boolean> {
    // В development режиме пропускаем проверку
    if (
      this.configService.get<string>('NODE_ENV') === 'development' &&
      !this.secretKey
    ) {
      this.logger.debug('Skipping verification in development mode');
      return true;
    }

    if (!this.secretKey) {
      this.logger.warn('Secret key not configured — verification skipped');
      return true; // Не блокируем если не настроен
    }

    if (!token) {
      throw AppErrors.badRequest(AppErrorMessages.RECAPTCHA_TOKEN_REQUIRED);
    }

    try {
      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `secret=${this.secretKey}&response=${token}`,
        },
      );

      const data = (await response.json()) as RecaptchaVerifyResponse;

      if (!data.success) {
        this.logger.warn(
          `Verification failed: ${JSON.stringify(data['error-codes'])}`,
        );
        throw AppErrors.badRequest(
          AppErrorMessages.RECAPTCHA_VERIFICATION_FAILED,
        );
      }

      // Проверяем score (для v3)
      if (data.score !== undefined && data.score < this.minScore) {
        this.logger.warn(`Score too low: ${data.score}`);
        throw AppErrors.badRequest(AppErrorMessages.RECAPTCHA_SUSPICIOUS);
      }

      // Проверяем action (опционально)
      if (action && data.action !== action) {
        this.logger.warn(
          `Action mismatch: expected ${action}, got ${data.action}`,
        );
        throw AppErrors.badRequest(AppErrorMessages.RECAPTCHA_INVALID_ACTION);
      }

      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Verification error', error as Error);
      throw AppErrors.badRequest(AppErrorMessages.RECAPTCHA_VERIFY_FAILED);
    }
  }

  /**
   * Проверить, настроен ли reCAPTCHA
   */
  isConfigured(): boolean {
    return !!this.secretKey;
  }
}
