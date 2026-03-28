import { Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { User, PhoneVerification } from '@prisma/client';

const RATE_LIMIT_MS = 60_000; // 1 minute
const MAX_ATTEMPTS = 3;

/**
 * Сервис валидации верификации телефона.
 * Отвечает за: проверка пользователя, статус телефона, rate limit, валидность кода.
 */
@Injectable()
export class PhoneVerificationValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Проверить, что пользователь может запросить код: существует, телефон не верифицирован, нет недавней отправки.
   */
  async assertCanSendCode(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppErrors.notFound(AppErrorMessages.USER_NOT_FOUND);
    }

    if (user.phoneVerified) {
      throw AppErrors.badRequest(AppErrorMessages.PHONE_ALREADY_VERIFIED);
    }

    const recentVerification = await this.prisma.phoneVerification.findFirst({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - RATE_LIMIT_MS),
        },
      },
    });

    if (recentVerification) {
      throw AppErrors.badRequest(AppErrorMessages.PHONE_WAIT_NEW_CODE);
    }

    return user;
  }

  /**
   * Проверить, что пользователь может верифицировать код.
   * Возвращает user и verification. Проверка самого кода — в action (с инкрементом попыток при ошибке).
   */
  async assertCanVerifyCode(
    userId: string,
    code: string,
  ): Promise<{ user: User; verification: PhoneVerification }> {
    if (!code || typeof code !== 'string') {
      throw AppErrors.badRequest(AppErrorMessages.PHONE_CODE_REQUIRED);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppErrors.notFound(AppErrorMessages.USER_NOT_FOUND);
    }

    if (user.phoneVerified) {
      throw AppErrors.badRequest(AppErrorMessages.PHONE_ALREADY_VERIFIED);
    }

    const verification = await this.prisma.phoneVerification.findFirst({
      where: {
        userId,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw AppErrors.badRequest(AppErrorMessages.PHONE_CODE_EXPIRED);
    }

    if (verification.attempts >= MAX_ATTEMPTS) {
      throw AppErrors.badRequest(AppErrorMessages.PHONE_TOO_MANY_ATTEMPTS);
    }

    return { user, verification };
  }
}
