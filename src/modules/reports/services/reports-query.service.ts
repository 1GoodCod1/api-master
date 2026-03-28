import { Injectable } from '@nestjs/common';
import { Prisma, ReportStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { SORT_ASC, SORT_DESC } from '../../../common/constants';
import type { AdminReportsStats } from '../types';

export type { AdminReportsStats };

@Injectable()
export class ReportsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Агрегаты по всем жалобам (без фильтра пагинации) — карточки админки
   */
  async getStats(): Promise<AdminReportsStats> {
    const [total, pendingCount, reviewedCount, resolvedCount, rejectedCount] =
      await Promise.all([
        this.prisma.report.count(),
        this.prisma.report.count({
          where: { status: ReportStatus.PENDING },
        }),
        this.prisma.report.count({
          where: { status: ReportStatus.REVIEWED },
        }),
        this.prisma.report.count({
          where: { status: ReportStatus.RESOLVED },
        }),
        this.prisma.report.count({
          where: { status: ReportStatus.REJECTED },
        }),
      ]);

    return {
      total,
      pendingCount,
      reviewedCount,
      resolvedCount,
      rejectedCount,
    };
  }

  /**
   * Получить все жалобы в системе (для панели администратора)
   * @param status Фильтр по статусу (PENDING, REVIEWED и т.д.)
   */
  async findAll(status?: string) {
    const where: Prisma.ReportWhereInput = {};
    if (status) where.status = status as ReportStatus;

    return this.prisma.report.findMany({
      where,
      orderBy: { createdAt: SORT_DESC },
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
      orderBy: { createdAt: SORT_DESC },
      include: {
        master: {
          include: { user: { select: { id: true, email: true, phone: true } } },
        },
        lead: true,
      },
    });
  }

  private getIncludes(): Prisma.ReportInclude {
    return {
      client: {
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          avatarFile: { select: { path: true } },
          clientPhotos: {
            orderBy: { order: SORT_ASC },
            take: 1,
            select: { file: { select: { path: true } } },
          },
        },
      },
      master: {
        select: {
          avatarFile: { select: { path: true } },
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              avatarFile: { select: { path: true } },
            },
          },
        },
      },
      lead: true,
    };
  }
}
