import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditService } from './audit.service';
import { AUDIT_EVENT, type AuditEventPayload } from './audit.events';

/**
 * Listens for domain-level audit events and writes them to the audit log.
 *
 * Services can emit audit events instead of directly calling AuditService:
 *
 *   this.eventEmitter.emit(AUDIT_EVENT, {
 *     userId, action, entityType, entityId, newData, ...
 *   });
 *
 * This decouples business logic from audit infrastructure:
 *   - Audit failures never break business operations
 *   - No need to inject AuditService into every service
 *   - Easy to add new audit consumers (e.g. external SIEM)
 */
@Injectable()
export class AuditEventListener {
  private readonly logger = new Logger(AuditEventListener.name);

  constructor(private readonly auditService: AuditService) {}

  @OnEvent(AUDIT_EVENT)
  async handleAuditEvent(payload: AuditEventPayload): Promise<void> {
    try {
      await this.auditService.log(payload);
    } catch (error) {
      // Never let audit failures propagate to business logic
      this.logger.error(
        `Failed to write audit log: action=${payload.action}, entity=${payload.entityType}:${payload.entityId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
