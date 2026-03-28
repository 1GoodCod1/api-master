import { Injectable } from '@nestjs/common';
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

    const validLead = leadId
      ? await this.prisma.lead.findFirst({
          where: {
            id: leadId,
            masterId,
            OR: [{ clientId }, { clientPhone: user.phone }],
          },
        })
      : await this.prisma.lead.findFirst({
          where: { masterId, OR: [{ clientId }, { clientPhone: user.phone }] },
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
