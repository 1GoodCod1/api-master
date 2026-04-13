import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConsentType, Prisma } from '@prisma/client';
import { AUDIT_EVENT } from '../../audit/audit.events';
import { AuditAction } from '../../audit/audit-action.enum';
import { AuditEntityType } from '../../audit/audit-entity-type.enum';
import {
  CONSENT_REPOSITORY,
  type IConsentRepository,
} from '../repositories/consent.repository';

const DEFAULT_VERSION = '1.0';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    @Inject(CONSENT_REPOSITORY)
    private readonly repo: IConsentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async grantConsent(
    userId: string,
    consentType: ConsentType,
    meta: { ipAddress?: string; userAgent?: string; version?: string },
  ) {
    const version = meta.version ?? DEFAULT_VERSION;
    const consent = await this.repo.upsertGranted({
      userId,
      consentType,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
      version,
    });

    this.logger.log(
      `Consent granted: user=${userId}, type=${consentType}, version=${version}`,
    );

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId,
      action: AuditAction.CONSENT_GRANTED,
      entityType: AuditEntityType.Consent,
      entityId: consentType,
      newData: {
        type: consentType,
        version,
      } satisfies Prisma.InputJsonValue,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return consent;
  }

  async revokeConsent(userId: string, consentType: ConsentType) {
    const consent = await this.repo.markRevoked(userId, consentType);

    this.logger.log(`Consent revoked: user=${userId}, type=${consentType}`);

    this.eventEmitter.emit(AUDIT_EVENT, {
      userId,
      action: AuditAction.CONSENT_REVOKED,
      entityType: AuditEntityType.Consent,
      entityId: consentType,
      newData: { type: consentType } satisfies Prisma.InputJsonValue,
    });

    return consent;
  }

  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await this.repo.findByUserAndType(userId, consentType);
    return consent?.granted === true && consent.revokedAt === null;
  }

  async getUserConsents(userId: string) {
    return this.repo.findAllByUser(userId);
  }
}
