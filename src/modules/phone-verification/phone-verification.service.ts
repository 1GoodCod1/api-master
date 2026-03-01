import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { EncryptionService } from '../shared/utils/encryption.service';
import { CacheService } from '../shared/cache/cache.service';
import { Twilio } from 'twilio';

@Injectable()
export class PhoneVerificationService {
  private twilioClient: Twilio | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.twilioClient = new Twilio(accountSid, authToken);
    }
  }

  /**
   * Отправить SMS код для верификации
   */
  async sendVerificationCode(
    userId: string,
  ): Promise<{ message: string; expiresAt: Date }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.phoneVerified) {
      throw new BadRequestException('Phone already verified');
    }

    // Проверяем, не отправляли ли мы код недавно (rate limiting)
    const recentVerification = await this.prisma.phoneVerification.findFirst({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 60000), // Последние 60 секунд
        },
      },
    });

    if (recentVerification) {
      throw new BadRequestException('Please wait before requesting a new code');
    }

    // Генерируем 6-значный код
    const code = this.encryption.generateCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 минут

    // Сохраняем код в БД
    await this.prisma.phoneVerification.create({
      data: {
        userId,
        phone: user.phone,
        code: this.encryption.hash(code), // Храним хэш кода
        expiresAt,
      },
    });

    // Отправляем SMS
    await this.sendSMS(
      user.phone,
      `Your verification code: ${code}. Valid for 10 minutes.`,
    );

    return {
      message: 'Verification code sent',
      expiresAt,
    };
  }

  /**
   * Верифицировать код
   */
  async verifyCode(userId: string, code: string): Promise<{ message: string }> {
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

    // Находим последнюю неверифицированную попытку
    const verification = await this.prisma.phoneVerification.findFirst({
      where: {
        userId,
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verification) {
      throw new BadRequestException('Verification code expired or not found');
    }

    // Проверяем количество попыток
    if (verification.attempts >= 3) {
      throw new BadRequestException(
        'Too many attempts. Please request a new code',
      );
    }

    // Проверяем код
    const hashedCode = this.encryption.hash(code);
    if (hashedCode !== verification.code) {
      // Увеличиваем счетчик попыток
      await this.prisma.phoneVerification.update({
        where: { id: verification.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new BadRequestException('Invalid verification code');
    }

    // Код верный - обновляем статус
    // Для клиентов автоматически ставим isVerified = true после верификации телефона
    const updateData: Prisma.UserUpdateInput = {
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      ...(user.role === 'CLIENT' && { isVerified: true }),
    };

    await this.prisma.$transaction([
      this.prisma.phoneVerification.update({
        where: { id: verification.id },
        data: {
          verified: true,
          verifiedAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      }),
    ]);

    // Инвалидируем кеш JWT (userMasterProfile), чтобы req.user.phoneVerified обновился без перелогина
    await this.cache.del(this.cache.keys.userMasterProfile(userId));
    await this.cache.del(this.cache.keys.userProfile(userId));

    return {
      message: 'Phone verified successfully',
    };
  }

  /**
   * Отправить SMS
   */
  private async sendSMS(phone: string, message: string): Promise<void> {
    // В development режиме просто логируем
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      console.log(`[SMS] To: ${phone}, Message: ${message}`);
      return;
    }

    if (!this.twilioClient) {
      console.warn('Twilio not configured. SMS not sent.');
      return;
    }

    try {
      const from = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      await this.twilioClient.messages.create({
        body: message,
        from,
        to: phone,
      });
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw new BadRequestException('Failed to send SMS');
    }
  }

  /**
   * Проверить статус верификации телефона
   */
  async getVerificationStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        phoneVerified: true,
        phoneVerifiedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
