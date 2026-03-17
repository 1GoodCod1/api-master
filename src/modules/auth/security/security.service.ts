import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SecuritySuspiciousService } from './services/security-suspicious.service';
import { SecurityBanService } from './services/security-ban.service';
import { SecurityAuthService } from './services/security-auth.service';

/**
 * SecurityService — координатор системы безопасности.
 * Делегирует задачи специализированным сервисам блокировок, аутентификации и отслеживания активности.
 */
@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    private readonly suspiciousService: SecuritySuspiciousService,
    private readonly banService: SecurityBanService,
    private readonly authService: SecurityAuthService,
  ) {}

  /**
   * Cron job для автоматической проверки безопасности (каждые 10 минут)
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkSuspiciousAccounts() {
    const usersToBlock = await this.suspiciousService.checkSuspiciousAccounts();

    for (const user of usersToBlock) {
      await this.banService.banUser(
        user.id,
        'Автоматическая блокировка: высокий рейтинг подозрительности',
        'system',
      );
    }

    if (usersToBlock.length > 0) {
      this.logger.log(
        `Автоматическая проверка завершена. Заблокировано пользователей: ${usersToBlock.length}`,
      );
    }
  }

  /**
   * Увеличить рейтинг подозрительности пользователя
   */
  async increaseSuspiciousScore(
    userId: string,
    points: number,
    reason: string,
  ) {
    return this.suspiciousService.increaseSuspiciousScore(
      userId,
      points,
      reason,
    );
  }

  /**
   * Заблокировать пользователя
   */
  async banUser(userId: string, reason: string, bannedBy: string) {
    return this.banService.banUser(userId, reason, bannedBy);
  }

  /**
   * Разблокировать пользователя
   */
  async unbanUser(userId: string, unbannedBy: string) {
    return this.banService.unbanUser(userId, unbannedBy);
  }

  /**
   * Проверить IP в черном списке
   */
  async isIpBlacklisted(ipAddress: string): Promise<boolean> {
    return this.banService.isIpBlacklisted(ipAddress);
  }

  /**
   * Добавить IP в черный список
   */
  async blacklistIp(
    ipAddress: string,
    reason: string,
    blockedBy: string,
    expiresAt?: Date,
  ) {
    return this.banService.blacklistIp(ipAddress, reason, blockedBy, expiresAt);
  }

  /**
   * Удалить IP из черного списка
   */
  async removeIpFromBlacklist(ipAddress: string) {
    return this.banService.removeIpFromBlacklist(ipAddress);
  }

  /**
   * Логировать вход пользователя
   */
  async logLogin(
    userId: string,
    ipAddress: string | undefined,
    userAgent: string | undefined,
    success: boolean,
    failReason?: string,
  ) {
    const result = await this.authService.logLogin(
      userId,
      ipAddress,
      userAgent,
      success,
      failReason,
    );

    if (!success && result.failedAttempts >= 5) {
      await this.suspiciousService.increaseSuspiciousScore(
        userId,
        20,
        'Множественные неудачные попытки входа',
      );
      this.logger.warn(
        `Пользователь ${userId} совершил ${result.failedAttempts} неудачных попыток входа`,
      );
    }
  }

  /**
   * Получить историю входов
   */
  async getLoginHistory(userId: string, limit: number = 10) {
    return this.authService.getLoginHistory(userId, limit);
  }

  /**
   * Изменить пароль
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    return this.authService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );
  }
}
