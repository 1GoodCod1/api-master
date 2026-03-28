import type { Prisma } from '@prisma/client';
import type { AuditEntityType } from '../audit-entity-type.enum';

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

export interface GetLogsFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}
