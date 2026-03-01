import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LeadStatus, type Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { CacheService } from '../../shared/cache/cache.service';
import { decodeId } from '../../shared/utils/id-encoder';
import {
  buildCursorQuery,
  buildPaginatedResponse,
  type PaginatedResult,
} from '../../shared/pagination/cursor-pagination';

/**
 * Сервис для получения данных по лидам (Query-часть)
 * Поддерживает cursor-based пагинацию для всех списочных методов.
 */
@Injectable()
export class LeadsQueryService {
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
    if (authUser.role === 'CLIENT') {
      const userId = authUser.id;
      const phone = authUser.phone || '';
      return this.findAllForClient(userId, phone, options);
    }

    const masterId = authUser.masterProfile?.id;
    if (!masterId) {
      throw new BadRequestException('Master profile not found');
    }

    return this.findAllForMaster(masterId, options);
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

        return buildPaginatedResponse(
          rawLeads as Array<{ id: string; createdAt: Date }>,
          total,
          limit,
          queryParams.usedCursor,
        );
      },
      this.cache.ttl.leads,
    );
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

    return buildPaginatedResponse(
      rawLeads as Array<{ id: string; createdAt: Date }>,
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

    if (!lead) throw new NotFoundException('Lead not found');

    if (authUser.role === 'ADMIN') return lead;
    if (authUser.role === 'CLIENT') {
      if (lead.clientId !== authUser.id) {
        throw new ForbiddenException('Access denied');
      }
      return lead;
    }
    if (authUser.role === 'MASTER') {
      if (!masterId) {
        throw new BadRequestException('Master profile not found');
      }
      if (lead.masterId !== masterId) {
        throw new ForbiddenException('Access denied');
      }
      return lead;
    }

    throw new ForbiddenException('Access denied');
  }

  /**
   * Статистика лидов — оптимизировано через groupBy вместо 5 отдельных count-запросов.
   */
  async getStats(authUser: JwtUser) {
    const masterId = authUser.masterProfile?.id;
    if (!masterId) {
      throw new BadRequestException('Master profile not found');
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
        newLeads: statusMap['NEW'] || 0,
        inProgress: statusMap['IN_PROGRESS'] || 0,
        closed: statusMap[LeadStatus.CLOSED] || 0,
        spam: statusMap['SPAM'] || 0,
      },
    };
  }
}
