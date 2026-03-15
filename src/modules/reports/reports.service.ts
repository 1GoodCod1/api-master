import { Injectable, NotFoundException } from '@nestjs/common';
import { ReportStatus } from '../../common/constants';
import { PrismaService } from '../shared/database/prisma.service';
import { InAppNotificationService } from '../notifications/services/in-app-notification.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { ReportsValidationService } from './services/reports-validation.service';
import { ReportsActionService } from './services/reports-action.service';
import { ReportsQueryService } from './services/reports-query.service';

/**
 * ReportsService — координатор модуля жалоб.
 * Делегирует проверку, выполнение действий и выборку данных узкоспециализированным сервисам.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: ReportsValidationService,
    private readonly actionService: ReportsActionService,
    private readonly queryService: ReportsQueryService,
    private readonly inAppNotifications: InAppNotificationService,
  ) {}

  /**
   * Создать новую жалобу
   */
  async create(clientId: string, dto: CreateReportDto) {
    const { finalLeadId } = await this.validationService.validateReportCreation(
      clientId,
      dto,
    );

    const report = await this.prisma.report.create({
      data: {
        clientId,
        masterId: dto.masterId,
        leadId: finalLeadId,
        reason: dto.reason,
        description: dto.description,
        evidence: dto.evidence ? JSON.stringify(dto.evidence) : null,
        status: ReportStatus.PENDING,
      },
      include: {
        client: { select: { id: true, email: true, phone: true } },
        master: {
          include: { user: { select: { id: true, email: true, phone: true } } },
        },
        lead: true,
      },
    });

    try {
      await this.inAppNotifications.notifyNewReport({
        reportId: report.id,
        reason: report.reason,
        clientId: report.clientId,
        masterId: report.masterId,
      });
    } catch (err) {
      console.error('Failed to send new report notification:', err);
    }

    return report;
  }

  /**
   * Список всех жалоб (Админ)
   */
  async findAll(status?: string) {
    return this.queryService.findAll(status);
  }

  /**
   * Список жалоб клиента
   */
  async findByClient(clientId: string) {
    return this.queryService.findByClient(clientId);
  }

  /**
   * Количество жалоб на мастера (для предупреждения на странице мастера)
   * @param masterId ID мастера
   */
  async getReportsAgainstMasterCount(masterId: string): Promise<number> {
    return this.queryService.countByMasterId(masterId);
  }

  /**
   * Обновление статуса жалобы и выполнение связанных действий (Админ)
   */
  async updateStatus(
    reportId: string,
    adminId: string,
    dto: UpdateReportStatusDto,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Report not found');

    if (dto.action) {
      await this.actionService.executeAction(report, dto.action, dto.notes);
    }

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        action: dto.action || null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        notes: dto.notes || null,
      },
      include: {
        client: { select: { id: true, email: true, phone: true } },
        master: {
          include: { user: { select: { id: true, email: true, phone: true } } },
        },
        lead: true,
      },
    });
  }
}
