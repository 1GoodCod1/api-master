import { Injectable } from '@nestjs/common';
import type { Report } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { ReportAction } from '../dto/update-report-status.dto';

@Injectable()
export class ReportsActionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Применить санкции (бан и др.) по результатам рассмотрения жалобы
   * @param report Объект жалобы
   * @param action Тип действия
   * @param notes Примечания к действию
   */
  async executeAction(
    report: Report,
    action: ReportAction,
    _notes?: string,
  ): Promise<void> {
    const master = await this.prisma.master.findUnique({
      where: { id: report.masterId },
      include: { user: true },
    });

    switch (action) {
      case ReportAction.BAN_CLIENT:
        await this.prisma.user.update({
          where: { id: report.clientId },
          data: { isBanned: true },
        });
        break;

      case ReportAction.BAN_MASTER:
        if (master) {
          await this.prisma.user.update({
            where: { id: master.userId },
            data: { isBanned: true },
          });
        }
        break;

      case ReportAction.BAN_IP:
        // Логика блокировки IP может быть расширена здесь
        break;

      case ReportAction.WARNING_CLIENT:
      case ReportAction.WARNING_MASTER:
        // Логика системы предупреждений
        break;
    }
  }
}
