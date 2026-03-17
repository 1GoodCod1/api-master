import { Injectable } from '@nestjs/common';
import { Prisma, ReportStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class ReportsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получить все жалобы в системе (для панели администратора)
   * @param status Фильтр по статусу (PENDING, REVIEWED и т.д.)
   */
  async findAll(status?: string) {
    const where: Prisma.ReportWhereInput = {};
    if (status) where.status = status as ReportStatus;

    return this.prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.getIncludes(),
    });
  }

  /**
   * Получить количество жалоб на мастера (для предупреждения)
   * @param masterId ID мастера
   */
  async countByMasterId(masterId: string): Promise<number> {
    return this.prisma.report.count({
      where: { masterId },
    });
  }

  /**
   * Получить список жалоб, поданных конкретным клиентом
   * @param clientId ID пользователя-клиента
   */
  async findByClient(clientId: string) {
    return this.prisma.report.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        master: {
          include: { user: { select: { id: true, email: true, phone: true } } },
        },
        lead: true,
      },
    });
  }

  private getIncludes() {
    return {
      client: { select: { id: true, email: true, phone: true } },
      master: {
        include: { user: { select: { id: true, email: true, phone: true } } },
      },
      lead: true,
    };
  }
}
