import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class SecuritySuspiciousService {
  private readonly logger = new Logger(SecuritySuspiciousService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Cron job для проверки подозрительных аккаунтов (каждые 10 минут)
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkSuspiciousAccounts() {
    this.logger.log('Запуск проверки подозрительных аккаунтов...');

    try {
      // 1. Проверка на спам-лиды
      const suspiciousLeads = await this.prisma.lead.groupBy({
        by: ['clientId'],
        where: {
          clientId: { not: null },
          spamScore: { gte: 20 },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _count: { id: true },
        having: { id: { _count: { gte: 3 } } },
      });

      for (const suspicious of suspiciousLeads) {
        if (suspicious.clientId) {
          await this.increaseSuspiciousScore(
            suspicious.clientId,
            30,
            'Множественные спам-лиды',
          );
        }
      }

      // 2. Проверка на жалобы от клиентов
      const reportsCount = await this.prisma.report.groupBy({
        by: ['clientId'],
        where: {
          status: ReportStatus.PENDING,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _count: { id: true },
        having: { id: { _count: { gte: 3 } } },
      });

      for (const report of reportsCount) {
        await this.increaseSuspiciousScore(
          report.clientId,
          40,
          'Множественные жалобы на пользователя',
        );
      }

      // 3. Проверка на жалобы на мастеров
      const masterReports = await this.prisma.report.groupBy({
        by: ['masterId'],
        where: {
          status: ReportStatus.PENDING,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _count: { id: true },
        having: { id: { _count: { gte: 5 } } },
      });

      for (const report of masterReports) {
        const master = await this.prisma.master.findUnique({
          where: { id: report.masterId },
        });
        if (master) {
          await this.increaseSuspiciousScore(
            master.userId,
            50,
            'Множественные жалобы на профиль мастера',
          );
        }
      }

      // 4. Автоматическая блокировка при достижении порога
      const usersToBlock = await this.prisma.user.findMany({
        where: { suspiciousScore: { gte: 100 }, isBanned: false },
      });

      return usersToBlock;
    } catch (error) {
      this.logger.error('Ошибка при проверке подозрительных аккаунтов:', error);
      return [];
    }
  }

  /**
   * Увеличить рейтинг подозрительности пользователя
   * @param userId ID пользователя
   * @param points Баллы
   * @param reason Причина
   */
  async increaseSuspiciousScore(
    userId: string,
    points: number,
    reason: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isBanned) return;

    const newScore = user.suspiciousScore + points;

    await this.prisma.user.update({
      where: { id: userId },
      data: { suspiciousScore: newScore },
    });

    await this.auditService.log({
      userId,
      action: 'SUSPICIOUS_SCORE_INCREASED',
      entityType: 'User',
      entityId: userId,
      oldData: { suspiciousScore: user.suspiciousScore },
      newData: { suspiciousScore: newScore, reason },
    });

    this.logger.warn(
      `Рейтинг подозрительности пользователя ${userId} увеличен на ${points}. Причина: ${reason}. Новое значение: ${newScore}`,
    );
  }
}
