import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ANALYTICS_TIMEFRAME,
  type AnalyticsTimeframe,
} from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { SORT_DESC } from '../../shared/constants/sort-order.constants';
import { RedisService } from '../../shared/redis/redis.service';

/** Normalize Prisma groupBy `_count` to a number for API consumers / charts. */
function countFromGroupBy(row: {
  _count: number | Record<string, number>;
}): number {
  const c = row._count;
  if (typeof c === 'number') return c;
  if (c && typeof c === 'object') {
    if (typeof c._all === 'number') return c._all;
    const n = Object.values(c).find((v) => typeof v === 'number');
    if (typeof n === 'number') return n;
  }
  return 0;
}

export interface GetLogsFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogQueryService {
  private readonly logger = new Logger(AuditLogQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getLogs(filters?: GetLogsFilters) {
    const {
      userId,
      action,
      entityType,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters ?? {};

    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              phone: true,
              role: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: SORT_DESC },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const logs = rows.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entityType,
      entityId: log.entityId,
      actorId: log.userId,
      ip: log.ipAddress,
      ua: log.userAgent,
      createdAt: log.createdAt.toISOString(),
      user: log.user,
    }));

    return {
      logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRecentStream(limit: number = 100) {
    try {
      const redis = this.redis.getClient();
      const stream = await redis.xrevrange(
        'audit:stream',
        '+',
        '-',
        'COUNT',
        limit,
      );

      const items = stream.map(([id, fields]: [string, string[]]) => {
        const entry: Record<string, string> = { id };
        for (let i = 0; i < fields.length; i += 2) {
          entry[fields[i]] = fields[i + 1];
        }
        return {
          id: entry.id,
          action: entry.action,
          entity: entry.entityType || entry.entity || '',
          entityId: entry.entityId,
          actorId: entry.userId,
          ip: entry.ip || entry.ipAddress,
          createdAt: entry.timestamp || entry.createdAt || '',
        };
      });

      return {
        items: await this.enrichStreamItemsWithUsers(items),
      };
    } catch {
      this.logger.warn('Redis Streams unavailable, falling back to database');
      return this.getRecentStreamFromDb(limit);
    }
  }

  /**
   * Redis stream stores only userId — resolve names/emails in one query for admin UI.
   */
  private async enrichStreamItemsWithUsers(
    items: Array<{
      id?: string;
      action?: string;
      entity?: string;
      entityId?: string;
      actorId?: string | null;
      ip?: string | null;
      createdAt?: string;
    }>,
  ) {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const ids = [
      ...new Set(
        items
          .map((i) => i.actorId)
          .filter(
            (id): id is string =>
              typeof id === 'string' &&
              id.length > 0 &&
              id.toLowerCase() !== 'system' &&
              uuidRe.test(id),
          ),
      ),
    ];
    if (ids.length === 0) {
      return items;
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return items.map((item) => {
      const aid = item.actorId;
      if (typeof aid !== 'string' || !byId.has(aid)) {
        return item;
      }
      const u = byId.get(aid)!;
      return {
        ...item,
        user: {
          email: u.email,
          phone: u.phone,
          role: u.role,
          firstName: u.firstName,
          lastName: u.lastName,
        },
      };
    });
  }

  private async getRecentStreamFromDb(limit: number) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: SORT_DESC },
      take: limit,
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            role: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      items: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entityType,
        entityId: log.entityId,
        actorId: log.userId,
        ip: log.ipAddress,
        ua: log.userAgent,
        createdAt: log.createdAt.toISOString(),
        user: log.user,
      })),
    };
  }

  async getStats(timeframe: AnalyticsTimeframe = ANALYTICS_TIMEFRAME.DAY) {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case ANALYTICS_TIMEFRAME.DAY:
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case ANALYTICS_TIMEFRAME.WEEK:
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case ANALYTICS_TIMEFRAME.MONTH:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
    }

    const [totalLogs, byAction, byUserRaw] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        where: { createdAt: { gte: startDate } },
        orderBy: { _count: { action: SORT_DESC } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        _count: true,
        where: { createdAt: { gte: startDate }, userId: { not: null } },
        orderBy: { _count: { userId: SORT_DESC } },
        take: 10,
      }),
    ]);

    const userIds = [
      ...new Set(
        byUserRaw
          .map((item) => item.userId)
          .filter(
            (id): id is string => typeof id === 'string' && id.length > 0,
          ),
      ),
    ];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
              firstName: true,
              lastName: true,
            },
          })
        : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    return {
      timeframe,
      totalLogs,
      byAction: byAction.map((item) => ({
        action: item.action,
        count: countFromGroupBy(item),
      })),
      byUser: byUserRaw.map((item) => {
        const uid = item.userId ?? 'unknown';
        const u =
          typeof item.userId === 'string'
            ? userById.get(item.userId)
            : undefined;
        return {
          userId: uid,
          count: countFromGroupBy(item),
          user: u
            ? {
                email: u.email,
                phone: u.phone,
                role: u.role,
                firstName: u.firstName,
                lastName: u.lastName,
              }
            : null,
        };
      }),
    };
  }

  /**
   * Delete audit log rows matching `where`. When dryRun, only counts matching rows.
   */
  async cleanupAuditLogs(
    where: Prisma.AuditLogWhereInput,
    dryRun: boolean,
  ): Promise<{ deleted: number; wouldDelete: number; dryRun: boolean }> {
    const wouldDelete = await this.prisma.auditLog.count({ where });
    if (dryRun) {
      return { deleted: 0, wouldDelete, dryRun: true };
    }
    const result = await this.prisma.auditLog.deleteMany({ where });
    return { deleted: result.count, wouldDelete: result.count, dryRun: false };
  }
}
