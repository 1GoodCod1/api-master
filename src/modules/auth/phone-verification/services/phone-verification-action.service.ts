import { Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { Prisma, UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/database/prisma.service';
import { EncryptionService } from '../../../shared/utils/encryption.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { Twilio } from 'twilio';
import { PhoneVerificationValidationService } from './phone-verification-validation.service';
import { AuditService } from '../../../audit/audit.service';
import { AuditAction } from '../../../audit/audit-action.enum';
import { AuditEntityType } from '../../../audit/audit-entity-type.enum';

const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60_000; // 10 minutes

/**
 * Сервис мутаций верификации телефона.
 * Отвечает за: отправка кода, верификация кода, отправка SMS.
 */
@Injectable()
export class PhoneVerificationActionService {
  private readonly twilioClient: Twilio | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly cache: CacheService,
    private readonly configService: ConfigService,
    private readonly validationService: PhoneVerificationValidationService,
    private readonly auditService: AuditService,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    if (accountSid && authToken) {
      this.twilioClient = new Twilio(accountSid, authToken);
    }
  }

  async sendVerificationCode(
    userId: string,
  ): Promise<{ message: string; expiresAt: Date }> {
    const user = await this.validationService.assertCanSendCode(userId);

    const code = this.encryption.generateCode(CODE_LENGTH);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.prisma.phoneVerification.create({
      data: {
        userId,
        phone: user.phone,
        code: this.encryption.hash(code),
        expiresAt,
      },
    });

    await this.sendSMS(
      user.phone,
      `Your verification code: ${code}. Valid for 10 minutes.`,
    );

    return {
      message: 'Verification code sent',
      expiresAt,
    };
  }

  async verifyCode(userId: string, code: string): Promise<{ message: string }> {
    const { user, verification } =
      await this.validationService.assertCanVerifyCode(userId, code);

    const hashedCode = this.encryption.hash(code);
    if (hashedCode !== verification.code) {
      await this.prisma.phoneVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      throw AppErrors.badRequest(AppErrorMessages.PHONE_CODE_INVALID);
    }

    const updateData: Prisma.UserUpdateInput = {
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      ...(user.role === UserRole.CLIENT && { isVerified: true }),
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

    await this.cache.del(this.cache.keys.userMasterProfile(userId));
    await this.cache.del(this.cache.keys.userProfile(userId));

    await this.auditService.log({
      userId,
      action: AuditAction.PHONE_VERIFIED,
      entityType: AuditEntityType.User,
      entityId: userId,
    });

    return { message: 'Phone verified successfully' };
  }

  private async sendSMS(phone: string, message: string): Promise<void> {
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
      throw AppErrors.badRequest(AppErrorMessages.PHONE_SMS_FAILED);
    }
  }
}
