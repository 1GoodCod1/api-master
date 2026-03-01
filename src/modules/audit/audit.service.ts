import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { RedisService } from '../shared/redis/redis.service';

interface AuditLogData {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  oldData?: Prisma.InputJsonValue;
  newData?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async log(data: AuditLogData) {
    try {
      // Проверяем существует ли пользователь если указан userId
      if (data.userId) {
        const userExists = await this.prisma.user.findUnique({
          where: { id: data.userId },
          select: { id: true },
        });

        // Если пользователь не найден, не создаем запись или используем null
        if (!userExists) {
          data.userId = null;
        }
      }

      const log = await this.prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          oldData: data.oldData,
          newData: data.newData,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      try {
        await this.redis
          .getClient()
          .xadd(
            'audit:stream',
            '*',
            'action',
            data.action,
            'userId',
            data.userId || 'system',
            'entityType',
            data.entityType || '',
            'entityId',
            data.entityId || '',
            'timestamp',
            new Date().toISOString(),
          );
      } catch {
        this.logger.debug('Redis Streams not available for audit logging');
      }

      const securityEvents = [
        'USER_BANNED',
        'USER_UNBANNED',
        'IP_BLACKLISTED',
        'SUSPICIOUS_SCORE_INCREASED',
        'LOGIN_FAILED',
        'PHONE_VERIFIED',
      ];

      if (securityEvents.includes(data.action)) {
        this.logger.warn(`[SECURITY] ${data.action}`, {
          userId: data.userId,
          entityType: data.entityType,
          entityId: data.entityId,
          ipAddress: data.ipAddress,
          details: data.newData,
        });
      }

      return log;
    } catch (error) {
      this.logger.error('Failed to save audit log:', error);
    }
  }

  async getLogs(filters?: {
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      action,
      entityType,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters || {};

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
      this.logger.warn('Redis Streams not available, falling back to database');

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
