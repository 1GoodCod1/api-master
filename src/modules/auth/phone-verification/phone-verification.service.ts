import { Injectable } from '@nestjs/common';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { PhoneVerificationActionService } from './services/phone-verification-action.service';
import { PhoneVerificationQueryService } from './services/phone-verification-query.service';

/**
 * PhoneVerificationService — фасад модуля верификации телефона.
 * Делегирует мутации в PhoneVerificationActionService, чтение — в PhoneVerificationQueryService.
 */
@Injectable()
export class PhoneVerificationService {
  constructor(
    private readonly actionService: PhoneVerificationActionService,
    private readonly queryService: PhoneVerificationQueryService,
  ) {}

  async sendVerificationCodeForUser(
    user: JwtUser,
  ): Promise<{ message: string; expiresAt: Date }> {
    return this.actionService.sendVerificationCode(user.id);
  }

  async verifyCodeForUser(
    user: JwtUser,
    code: string,
  ): Promise<{ message: string }> {
    return this.actionService.verifyCode(user.id, code);
  }

  async getVerificationStatusForUser(user: JwtUser) {
    return this.queryService.getVerificationStatus(user.id);
  }
}
