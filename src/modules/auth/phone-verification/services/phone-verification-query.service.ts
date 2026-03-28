import { Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { PrismaService } from '../../../shared/database/prisma.service';

/**
 * Сервис чтения статуса верификации телефона.
 */
@Injectable()
export class PhoneVerificationQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getVerificationStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        phoneVerified: true,
        phoneVerifiedAt: true,
      },
    });

    if (!user) {
      throw AppErrors.notFound(AppErrorMessages.USER_NOT_FOUND);
    }

    return user;
  }
}
