import { Injectable, Logger } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuditService } from '../../../audit/audit.service';
import { AuditAction } from '../../../audit/audit-action.enum';
import { AuditEntityType } from '../../../audit/audit-entity-type.enum';

@Injectable()
export class SecurityAuthService {
  private readonly logger = new Logger(SecurityAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Логировать попытку входа
   * @param userId ID пользователя
   * @param ipAddress IP адрес
   * @param userAgent Данные браузера
   * @param success Успешность входа
   * @param failReason Причина отказа (при ошибке)
   */
  async logLogin(
    userId: string,
    ipAddress: string | undefined,
    userAgent: string | undefined,
    success: boolean,
    failReason?: string,
  ) {
    await this.prisma.loginHistory.create({
      data: {
        userId,
        ipAddress,
        userAgent,
        success,
        failReason,
      },
    });

    if (!success) {
      const failedAttempts = await this.prisma.loginHistory.count({
        where: {
          userId,
          success: false,
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        },
      });

      return { failedAttempts };
    }
    return { failedAttempts: 0 };
  }

  /**
   * Получить историю входов пользователя
   * @param userId ID пользователя
   * @param limit Лимит записей
   */

  async getLoginHistory(userId: string, limit: number = 10) {
    return this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Смена пароля
   * @param userId ID пользователя
   * @param currentPassword Текущий пароль
   * @param newPassword Новый пароль
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppErrors.badRequest(AppErrorMessages.USER_NOT_FOUND);
    if (!user.password)
      throw AppErrors.badRequest(AppErrorMessages.PASSWORD_NO_SET);

    const isPasswordValid = await argon2.verify(user.password, currentPassword);
    if (!isPasswordValid)
      throw AppErrors.unauthorized(AppErrorMessages.PASSWORD_CURRENT_WRONG);

    const isSamePassword = await argon2.verify(user.password, newPassword);
    if (isSamePassword)
      throw AppErrors.badRequest(AppErrorMessages.PASSWORD_SAME_AS_OLD);

    const hashedPassword = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.CHANGE_PASSWORD,
      entityType: AuditEntityType.User,
      entityId: userId,
    });

    this.logger.log(`Password changed for user ${userId}`);
    return { message: 'Password changed successfully' };
  }
}
