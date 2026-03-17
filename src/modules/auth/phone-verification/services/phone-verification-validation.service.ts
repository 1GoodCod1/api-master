import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
      throw new NotFoundException('User not found');
    }

    if (user.phoneVerified) {
      throw new BadRequestException('Phone already verified');
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
      throw new BadRequestException('Please wait before requesting a new code');
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
      throw new BadRequestException('Code is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.phoneVerified) {
      throw new BadRequestException('Phone already verified');
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
      throw new BadRequestException('Verification code expired or not found');
    }

    if (verification.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Too many attempts. Please request a new code',
      );
    }

    return { user, verification };
  }
}
