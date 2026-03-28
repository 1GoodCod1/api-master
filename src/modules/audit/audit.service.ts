import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditEntityType } from './audit-entity-type.enum';
import { AuditLogWriterService } from './services/audit-log-writer.service';
import { AuditLogQueryService } from './services/audit-log-query.service';
import type { AuditCleanupDto } from './dto/audit-cleanup.dto';
import {
  assertCleanupSafety,
  buildAuditCleanupWhere,
} from './audit-cleanup.helper';
import {
  ANALYTICS_TIMEFRAME,
  ANALYTICS_TIMEFRAMES,
  type AnalyticsTimeframe,
} from '../../common/constants';

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
export class AuditService {
  constructor(
    private readonly writer: AuditLogWriterService,
    private readonly query: AuditLogQueryService,
  ) {}

  async log(data: AuditLogData) {
    return this.writer.log(data);
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
    return this.query.getLogs(filters);
  }

  async getRecentStream(limit: number = 100) {
    return this.query.getRecentStream(limit);
  }

  async getStats(timeframe: AnalyticsTimeframe = ANALYTICS_TIMEFRAME.DAY) {
    return this.query.getStats(timeframe);
  }

  /**
   * Парсит query-параметры и возвращает логи (для контроллера).
   */
  getLogsFromQuery(params: {
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const filters: {
      userId?: string;
      action?: string;
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {};

    if (params.userId) filters.userId = params.userId;
    if (params.action) filters.action = params.action;
    if (params.entityType) filters.entityType = params.entityType;
    if (params.startDate || params.endDate) {
      filters.startDate = params.startDate
        ? new Date(params.startDate)
        : undefined;
      filters.endDate = params.endDate ? new Date(params.endDate) : undefined;
    }

    const page =
      typeof params.page === 'string'
        ? parseInt(params.page, 10)
        : (params.page ?? 1);
    const limit =
      typeof params.limit === 'string'
        ? parseInt(params.limit, 10)
        : (params.limit ?? 50);

    filters.page = page || 1;
    filters.limit = limit || 50;

    return this.query.getLogs(filters);
  }

  /**
   * Парсит limit из query и возвращает stream (для контроллера).
   */
  getRecentStreamFromQuery(limit?: string | number) {
    const limitNum =
      typeof limit === 'string' ? parseInt(limit, 10) : (limit ?? 100);
    return this.query.getRecentStream(limitNum || 100);
  }

  /**
   * Валидирует timeframe и возвращает статистику (для контроллера).
   */
  getStatsFromQuery(timeframe?: string) {
    const tf = ANALYTICS_TIMEFRAMES.includes(timeframe as AnalyticsTimeframe)
      ? (timeframe as AnalyticsTimeframe)
      : ANALYTICS_TIMEFRAME.DAY;
    return this.query.getStats(tf);
  }

  /**
   * Bulk-delete audit log rows (admin). Use dryRun to preview counts.
   */
  async cleanupAuditLogs(dto: AuditCleanupDto) {
    assertCleanupSafety(dto);
    const where = buildAuditCleanupWhere(dto);
    return this.query.cleanupAuditLogs(where, !!dto.dryRun);
  }
}
