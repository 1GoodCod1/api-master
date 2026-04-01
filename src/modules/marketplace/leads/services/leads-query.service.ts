import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { type Prisma, UserRole } from '@prisma/client';
import { ACTIVE_LEAD_STATUSES, LeadStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_DESC } from '../../../../common/constants';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
import { CacheService } from '../../../shared/cache/cache.service';
import { decodeId, encodeId } from '../../../shared/utils/id-encoder';
import {
  buildCursorQuery,
  buildPaginatedResponse,
  type PaginatedResult,
} from '../../../shared/pagination/cursor-pagination';

/**
 * Сервис для получения данных по лидам (Query-часть)
 * Поддерживает cursor-based пагинацию для всех списочных методов.
 */
@Injectable()
export class LeadsQueryService {
  private readonly logger = new Logger(LeadsQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Получение лидов в зависимости от роли с cursor-based пагинацией.
   */
  async findAll(
    authUser: JwtUser,
    options: {
      status?: string;
      limit?: number;
      cursor?: string;
      page?: number;
    } = {},
  ) {
    try {
      if (authUser.role === UserRole.CLIENT) {
        const userId = authUser.id;
        const phone = authUser.phone || '';
        return await this.findAllForClient(userId, phone, options);
      }

      const masterId = authUser.masterProfile?.id;
      if (!masterId) {
        throw AppErrors.badRequest(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
      }

      return await this.findAllForMaster(masterId, options);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('findAll leads failed', err);
      throw err;
    }
  }

  private async findAllForMaster(
    masterId: string,
    options: {
      status?: string;
      limit?: number;
      cursor?: string;
      page?: number;
    } = {},
  ): Promise<PaginatedResult<unknown>> {
    const { status, limit: rawLimit = 20, cursor, page } = options;

    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));
    const cacheKey = this.cache.keys.masterLeads(
      masterId,
      status || null,
      page || 1,
    );

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const baseWhere: Prisma.LeadWhereInput = { masterId };
        if (status) baseWhere.status = status as LeadStatus;

        const queryParams = buildCursorQuery(
          baseWhere as Record<string, unknown>,
          cursor,
          page,
          limit,
        );

        const [rawLeads, total] = await Promise.all([
          this.prisma.lead.findMany({
            where: queryParams.where as Prisma.LeadWhereInput,
            orderBy:
              queryParams.orderBy as Prisma.LeadOrderByWithRelationInput[],
            take: queryParams.take,
            skip: queryParams.skip,
            include: {
              files: {
                include: {
                  file: {
                    select: {
                      id: true,
                      path: true,
                      mimetype: true,
                      filename: true,
                    },
                  },
                },
              },
              master: {
                select: {
                  id: true,
                  slug: true,
                  user: { select: { firstName: true, lastName: true } },
                  category: { select: { id: true, name: true } },
                  city: { select: { id: true, name: true } },
                },
              },
            },
          }),
          this.prisma.lead.count({ where: baseWhere }),
        ]);

        const items = this.mapLeadsWithMasterEncodedId(rawLeads);
        return buildPaginatedResponse(
          items as unknown as Array<{ id: string; createdAt: Date }>,
          total,
          limit,
          queryParams.usedCursor,
        );
      },
      this.cache.ttl.leads,
    );
  }

  private mapLeadsWithMasterEncodedId(
    leads: Array<{ id: string; master?: { id: string } | null }>,
  ) {
    return leads.map((lead) => ({
      ...lead,
      master: lead.master
        ? { ...lead.master, encodedId: encodeId(lead.master.id) }
        : lead.master,
    }));
  }

  private async findAllForClient(
    userId: string,
    clientPhone: string,
    options: {
      status?: string;
      limit?: number;
      cursor?: string;
      page?: number;
    } = {},
  ): Promise<PaginatedResult<unknown>> {
    const { status, limit: rawLimit = 20, cursor, page } = options;

    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));

    const baseWhere: Prisma.LeadWhereInput = {
      OR: [{ clientId: userId }, { clientPhone }],
    };
    if (status) baseWhere.status = status as LeadStatus;

    const queryParams = buildCursorQuery(
      baseWhere as Record<string, unknown>,
      cursor,
      page,
      limit,
    );

    const [rawLeads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where: queryParams.where as Prisma.LeadWhereInput,
        orderBy: queryParams.orderBy as Prisma.LeadOrderByWithRelationInput[],
        take: queryParams.take,
        skip: queryParams.skip,
        include: {
          files: {
            include: {
              file: {
                select: {
                  id: true,
                  path: true,
                  mimetype: true,
                  filename: true,
                },
              },
            },
          },
          master: {
            select: {
              id: true,
              slug: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  email: true,
                },
              },
              category: { select: { id: true, name: true } },
              city: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.lead.count({ where: baseWhere }),
    ]);

    const items = this.mapLeadsWithMasterEncodedId(rawLeads);
    return buildPaginatedResponse(
      items as unknown as Array<{ id: string; createdAt: Date }>,
      total,
      limit,
      queryParams.usedCursor,
    );
  }

  /**
   * Получение одного лида (MASTER/ADMIN: свой/любой; CLIENT: только свой по clientId)
   */
  async findOne(idOrEncoded: string, authUser: JwtUser) {
    const decodedId = decodeId(idOrEncoded);
    const leadId = decodedId || idOrEncoded;

    const masterId = authUser.masterProfile?.id;

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        files: {
          include: {
            file: {
              select: { id: true, path: true, mimetype: true, filename: true },
            },
          },
        },
        client: { select: { firstName: true, lastName: true } },
        master: {
          select: {
            id: true,
            slug: true,
            user: { select: { firstName: true, lastName: true } },
            category: { select: { id: true, name: true } },
            city: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!lead) throw AppErrors.notFound(AppErrorMessages.LEAD_NOT_FOUND);

    const withEncoded = this.mapLeadsWithMasterEncodedId([lead])[0];
    if (authUser.role === UserRole.ADMIN) return withEncoded;
    if (authUser.role === UserRole.CLIENT) {
      if (lead.clientId !== authUser.id) {
        throw AppErrors.forbidden(AppErrorMessages.ACCESS_DENIED);
      }
      return withEncoded;
    }
    if (authUser.role === UserRole.MASTER) {
      if (!masterId) {
        throw AppErrors.badRequest(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
      }
      if (lead.masterId !== masterId) {
        throw AppErrors.forbidden(AppErrorMessages.ACCESS_DENIED);
      }
      return withEncoded;
    }

    throw AppErrors.forbidden(AppErrorMessages.ACCESS_DENIED);
  }

  /**
   * Статистика лидов — оптимизировано через groupBy вместо 5 отдельных count-запросов.
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
