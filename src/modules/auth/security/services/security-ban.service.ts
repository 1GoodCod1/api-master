import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuditService } from '../../../audit/audit.service';
import { AuditAction } from '../../../audit/audit-action.enum';
import { AuditEntityType } from '../../../audit/audit-entity-type.enum';

@Injectable()
export class SecurityBanService {
  private readonly logger = new Logger(SecurityBanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Заблокировать пользователя
   * @param userId ID пользователя
   * @param reason Причина блокировки
   * @param bannedBy Кто заблокировал (ID или 'system')
   */
  async banUser(userId: string, reason: string, bannedBy: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isBanned) return;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        bannedReason: reason,
      },
    });

    await this.auditService.log({
      userId: bannedBy === 'system' ? null : bannedBy,
      action: AuditAction.USER_BANNED,
      entityType: AuditEntityType.User,
      entityId: userId,
      newData: { reason, bannedBy },
    });

    this.logger.warn(
      `Пользователь ${userId} заблокирован. Причина: ${reason}. Кем: ${bannedBy}`,
    );
  }

  /**
   * Разблокировать пользователя
   * @param userId ID пользователя
   * @param unbannedBy Кто разблокировал
   */
  async unbanUser(userId: string, unbannedBy: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        bannedAt: null,
        bannedReason: null,
        suspiciousScore: 0,
      },
    });

    await this.auditService.log({
      userId: unbannedBy,
      action: AuditAction.USER_UNBANNED,
      entityType: AuditEntityType.User,
      entityId: userId,
      newData: { unbannedBy },
    });

    this.logger.log(
      `Пользователь ${userId} разблокирован пользователем ${unbannedBy}`,
    );
  }

  /**
   * Проверить, находится ли IP в черном списке
   * @param ipAddress IP адрес
   */
  async isIpBlacklisted(ipAddress: string): Promise<boolean> {
    const blacklisted = await this.prisma.ipBlacklist.findFirst({
      where: {
        ipAddress,
        OR: [{ permanent: true }, { expiresAt: { gt: new Date() } }],
      },
    });

    return !!blacklisted;
  }

  /**
   * Добавить IP адрес в черный список
   * @param ipAddress IP адрес
   * @param reason Причина
   * @param blockedBy Кто заблокировал
   * @param expiresAt Срок истечения (необязательно)
   */
  async blacklistIp(
    ipAddress: string,
    reason: string,
    blockedBy: string,
    expiresAt?: Date,
  ) {
    await this.prisma.ipBlacklist.create({
      data: {
        ipAddress,
        reason,
        blockedBy,
        expiresAt,
        permanent: !expiresAt,
      },
    });

    await this.auditService.log({
      userId: blockedBy,
      action: AuditAction.IP_BLACKLISTED,
      entityType: AuditEntityType.IpBlacklist,
      entityId: ipAddress,
      newData: { reason, blockedBy, expiresAt },
    });

    this.logger.warn(
      `IP ${ipAddress} добавлен в черный список. Причина: ${reason}`,
    );
  }

  /**
   * Удалить IP адрес из черного списка
   * @param ipAddress IP адрес
   */
  async removeIpFromBlacklist(ipAddress: string) {
    await this.prisma.ipBlacklist.deleteMany({
      where: { ipAddress },
    });

    this.logger.log(`IP ${ipAddress} удален из черного списка`);
  }
}
