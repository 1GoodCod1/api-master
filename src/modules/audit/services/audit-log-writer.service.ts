import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { SECURITY_ACTION_SET } from '../audit-action.enum';
import { AuditEntityType } from '../audit-entity-type.enum';

export interface AuditLogData {
  userId?: string | null;
  action: string;
  entityType?: AuditEntityType;
  entityId?: string;
  oldData?: Prisma.InputJsonValue;
  newData?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogWriterService {
  private readonly logger = new Logger(AuditLogWriterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async log(data: AuditLogData) {
    try {
      let userId = data.userId;
      if (userId) {
        const userExists = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (!userExists) userId = null;
      }

      const log = await this.prisma.auditLog.create({
        data: {
          userId: userId ?? null,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          oldData: data.oldData,
          newData: data.newData,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      await this.publishToStream(data, userId);
      this.logSecurityEventIfNeeded(data, userId);

      return log;
    } catch (error) {
      this.logger.error('Ошибка сохранения audit log:', error);
    }
  }

  private async publishToStream(
    data: AuditLogData,
    userId: string | null | undefined,
  ): Promise<void> {
    try {
      await this.redis
        .getClient()
        .xadd(
          'audit:stream',
          '*',
          'action',
          data.action,
          'userId',
          userId || 'system',
          'entityType',
          data.entityType || '',
          'entityId',
          data.entityId || '',
          'timestamp',
          new Date().toISOString(),
        );
    } catch {
      this.logger.debug('Redis Streams недоступны для audit logging');
    }
  }

  private logSecurityEventIfNeeded(
    data: AuditLogData,
    userId: string | null | undefined,
  ): void {
    if (SECURITY_ACTION_SET.has(data.action)) {
      this.logger.warn(`[SECURITY] ${data.action}`, {
        userId,
        entityType: data.entityType,
        entityId: data.entityId,
        ipAddress: data.ipAddress,
        details: data.newData,
      });
    }
  }
}
