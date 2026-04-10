import { Injectable, Logger } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { Prisma } from '@prisma/client';
import { ACTIVE_LEAD_STATUSES, LeadStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_DESC } from '../../../../common/constants';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';

/**
 * Агрегация и state-lookup по лидам.
 * Listing (findAll / findOne) — в LeadsListService.
 */
@Injectable()
export class LeadsQueryService {
  private readonly logger = new Logger(LeadsQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Статистика лидов — groupBy вместо 5 отдельных count-запросов.
   */
  async getStats(authUser: JwtUser) {
    const masterId = authUser.masterProfile?.id;
    if (!masterId) {
      throw AppErrors.badRequest(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    }

    const [total, statusGroups] = await Promise.all([
      this.prisma.lead.count({ where: { masterId } }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { masterId },
        _count: true,
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const g of statusGroups) {
      statusMap[g.status] = g._count;
    }

    return {
      total,
      byStatus: {
        newLeads: statusMap[LeadStatus.NEW] || 0,
        inProgress: statusMap[LeadStatus.IN_PROGRESS] || 0,
        pendingClose: statusMap[LeadStatus.PENDING_CLOSE] || 0,
        closed: statusMap[LeadStatus.CLOSED] || 0,
        spam: statusMap[LeadStatus.SPAM] || 0,
      },
    };
  }

  /**
   * Список уникальных клиентов мастера с агрегированной статистикой по заявкам.
   * Группировка и сортировка выполняются в PostgreSQL — не зависит от объёма лидов.
   */
  async getClients(
    authUser: JwtUser,
    options: { search?: string; sortBy?: string; sortOrder?: string } = {},
  ) {
    const masterId = authUser.masterProfile?.id;
    if (!masterId) {
      throw AppErrors.badRequest(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    }

    const { search, sortBy = 'lastRequestAt', sortOrder = 'desc' } = options;

    const searchCondition = search
      ? Prisma.sql`AND ("clientPhone" LIKE ${`%${search}%`} OR "clientName" ILIKE ${`%${search}%`})`
      : Prisma.empty;

    const dir = Prisma.raw(sortOrder === 'asc' ? 'ASC' : 'DESC');
    const orderByClause = ((): Prisma.Sql => {
      switch (sortBy) {
        case 'totalRequests':
          return Prisma.sql`"totalRequests" ${dir}`;
        case 'clientName':
          return Prisma.sql`"clientName" ${dir} NULLS LAST`;
        case 'firstRequestAt':
          return Prisma.sql`"firstRequestAt" ${dir}`;
        default:
          return Prisma.sql`"lastRequestAt" ${dir}`;
      }
    })();

    type Row = {
      clientPhone: string;
      clientName: string | null;
      clientId: string | null;
      totalRequests: number;
      lastRequestAt: Date;
      firstRequestAt: Date;
      lastMessage: string | null;
      statusBreakdown: Record<string, number> | null;
    };

    const rows = await this.prisma.$queryRaw<Row[]>`
      WITH filtered AS (
        SELECT * FROM leads
        WHERE "masterId" = ${masterId}
        ${searchCondition}
      ),
      per_status AS (
        SELECT "clientPhone", status, COUNT(*)::int AS cnt
        FROM filtered
        GROUP BY "clientPhone", status
      ),
      aggregated AS (
        SELECT
          f."clientPhone",
          (
            SELECT f2."clientName" FROM filtered f2
            WHERE f2."clientPhone" = f."clientPhone"
              AND f2."clientName" IS NOT NULL
            ORDER BY f2."createdAt" DESC
            LIMIT 1
          ) AS "clientName",
          (
            SELECT f2."clientId" FROM filtered f2
            WHERE f2."clientPhone" = f."clientPhone"
              AND f2."clientId" IS NOT NULL
            LIMIT 1
          ) AS "clientId",
          COUNT(*)::int AS "totalRequests",
          MAX(f."createdAt") AS "lastRequestAt",
          MIN(f."createdAt") AS "firstRequestAt",
          (
            SELECT f2."message" FROM filtered f2
            WHERE f2."clientPhone" = f."clientPhone"
            ORDER BY f2."createdAt" DESC
            LIMIT 1
          ) AS "lastMessage",
          (
            SELECT jsonb_object_agg(ps.status, ps.cnt)
            FROM per_status ps
            WHERE ps."clientPhone" = f."clientPhone"
          ) AS "statusBreakdown"
        FROM filtered f
        GROUP BY f."clientPhone"
      )
      SELECT * FROM aggregated
      ORDER BY ${orderByClause}
    `;

    return {
      items: rows.map((row) => ({
        ...row,
        statusBreakdown: (row.statusBreakdown as Record<string, number>) ?? {},
      })),
      total: rows.length,
    };
  }

  /**
   * Проверка наличия активной заявки от клиента к мастеру
   */
  async getActiveLeadToMaster(clientId: string, masterId: string) {
    return this.prisma.lead.findFirst({
      where: {
        clientId,
        masterId,
        status: { in: [...ACTIVE_LEAD_STATUSES] },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        message: true,
        conversation: { select: { id: true } },
      },
      orderBy: { createdAt: SORT_DESC },
    });
  }

  /**
   * Проверка наличия успешно закрытой заявки от клиента к мастеру
   * (для показа кнопки «Обратиться снова»)
   */
  async getCompletedLeadToMaster(clientId: string, masterId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        clientId,
        masterId,
        status: LeadStatus.CLOSED,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        message: true,
      },
      orderBy: { createdAt: SORT_DESC },
    });

    return { hasCompletedLead: !!lead, lastLead: lead };
  }
}
