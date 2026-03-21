import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';

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

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              phone: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

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

      return {
        items: stream.map(([id, fields]: [string, string[]]) => {
          const entry: Record<string, string> = { id };
          for (let i = 0; i < fields.length; i += 2) {
            entry[fields[i]] = fields[i + 1];
          }
          return entry;
        }),
      };
    } catch {
      this.logger.warn('Redis Streams недоступны, используем базу данных');
      return this.getRecentStreamFromDb(limit);
    }
  }

  private async getRecentStreamFromDb(limit: number) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            email: true,
            role: true,
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

  async getStats(timeframe: 'day' | 'week' | 'month' = 'day') {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
    }

    const [totalLogs, byAction, byUser] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        where: { createdAt: { gte: startDate } },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        _count: true,
        where: { createdAt: { gte: startDate }, userId: { not: null } },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      timeframe,
      totalLogs,
      byAction: byAction.map((item) => ({
        action: item.action,
        count: item._count,
      })),
      byUser,
    };
  }
}
