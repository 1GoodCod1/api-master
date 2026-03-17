import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ReportStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
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
    if (!master) throw new NotFoundException('Master not found');

    const user = await this.prisma.user.findUnique({ where: { id: clientId } });
    if (!user) throw new NotFoundException('User not found');

    let validLead: { id: string } | null = null;
    if (leadId) {
      validLead = await this.prisma.lead.findFirst({
        where: {
          id: leadId,
          masterId,
          OR: [{ clientId }, { clientPhone: user.phone }],
        },
      });
    } else {
      validLead = await this.prisma.lead.findFirst({
        where: { masterId, OR: [{ clientId }, { clientPhone: user.phone }] },
      });
    }

    if (!validLead) {
      throw new ForbiddenException(
        'You can only report a master if you have sent a lead to them',
      );
    }

    const existingReport = await this.prisma.report.findFirst({
      where: {
        clientId,
        masterId,
        status: { in: [ReportStatus.PENDING, ReportStatus.REVIEWED] },
      },
    });

    if (existingReport) {
      throw new BadRequestException(
        'You have already reported this master. Please wait for review.',
      );
    }

    return { finalLeadId: leadId || validLead.id };
  }
}
