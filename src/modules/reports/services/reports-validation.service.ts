import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import { ReportStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateReportDto } from '../dto/create-report.dto';

@Injectable()
export class ReportsValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Проверить условия для возможности подачи жалобы
   * @param clientId ID клиента
   * @param dto Данные жалобы
   */
  async validateReportCreation(clientId: string, dto: CreateReportDto) {
    const { masterId, leadId } = dto;

    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
    });
    if (!master) throw AppErrors.notFound(AppErrorMessages.MASTER_NOT_FOUND);

    const user = await this.prisma.user.findUnique({ where: { id: clientId } });
    if (!user) throw AppErrors.notFound(AppErrorMessages.USER_NOT_FOUND);

    const leadOr: Prisma.LeadWhereInput[] = [{ clientId }];
    if (user.phone) {
      leadOr.push({ clientPhone: user.phone });
    }

    const validLead = leadId
      ? await this.prisma.lead.findFirst({
          where: {
            id: leadId,
            masterId,
            OR: leadOr,
          },
        })
      : await this.prisma.lead.findFirst({
          where: { masterId, OR: leadOr },
        });

    if (!validLead) {
      throw AppErrors.forbidden(AppErrorMessages.REPORT_NEED_LEAD);
    }

    const existingReport = await this.prisma.report.findFirst({
      where: {
        clientId,
        masterId,
        status: { in: [ReportStatus.PENDING, ReportStatus.REVIEWED] },
      },
    });

    if (existingReport) {
      throw AppErrors.badRequest(AppErrorMessages.REPORT_ALREADY_PENDING);
    }

    return { finalLeadId: leadId || validLead.id };
  }
}
