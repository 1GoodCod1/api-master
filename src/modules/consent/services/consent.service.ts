import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConsentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { AUDIT_EVENT } from '../../audit/audit.events';
import { AuditAction } from '../../audit/audit-action.enum';
import { AuditEntityType } from '../../audit/audit-entity-type.enum';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Зафиксировать согласие с IP и user-agent для аудита GDPR.
   */
  async grantConsent(
    userId: string,
    consentType: ConsentType,
    meta: { ipAddress?: string; userAgent?: string; version?: string },
  ) {
    const consent = await this.prisma.userConsent.upsert({
      where: {
        userId_consentType: { userId, consentType },
      },
      create: {
        userId,
        consentType,
        granted: true,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
        version: meta.version ?? '1.0',
      },
      update: {
        granted: true,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
        version: meta.version ?? '1.0',
        revokedAt: null,
      },
    });

    this.logger.log(
      `Consent granted: user=${userId}, type=${consentType}, version=${meta.version ?? '1.0'}`,
    );

    // Audit via event (decoupled from AuditService)
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId,
      action: AuditAction.CONSENT_GRANTED,
      entityType: AuditEntityType.Consent,
      entityId: consentType,
      newData: {
        type: consentType,
        version: meta.version ?? '1.0',
      } satisfies Prisma.InputJsonValue,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return consent;
  }

  /**
   * Отзыв согласия (право по GDPR).
   */
  async revokeConsent(userId: string, consentType: ConsentType) {
    const consent = await this.prisma.userConsent.update({
      where: {
        userId_consentType: { userId, consentType },
      },
      data: {
        granted: false,
        revokedAt: new Date(),
      },
    });

    this.logger.log(`Consent revoked: user=${userId}, type=${consentType}`);

    // Audit via event (decoupled from AuditService)
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId,
      action: AuditAction.CONSENT_REVOKED,
      entityType: AuditEntityType.Consent,
      entityId: consentType,
      newData: { type: consentType } satisfies Prisma.InputJsonValue,
    });

    return consent;
  }

  /**
   * Check if user has active consent for a given type.
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await this.prisma.userConsent.findUnique({
      where: {
        userId_consentType: { userId, consentType },
      },
    });
    return consent?.granted === true && consent.revokedAt === null;
  }

  /**
   * Все согласия пользователя (для экспорта данных по GDPR).
   */
  async getUserConsents(userId: string) {
    return this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
