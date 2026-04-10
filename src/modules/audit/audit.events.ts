import type { AuditLogData } from './types';

/**
 * Domain-level audit events.
 *
 * Usage in services:
 *   this.eventEmitter.emit(AUDIT_EVENT, payload);
 */
export const AUDIT_EVENT = 'audit.log';

export type AuditEventPayload = AuditLogData;
