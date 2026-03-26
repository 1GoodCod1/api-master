import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { ConsentType } from '../dto/grant-consent.dto';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Record user consent with IP and user-agent for GDPR audit trail.
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

    // Audit log
    await this.auditService.log({
      userId: userId,
      action: 'CONSENT_GRANTED',
      entityType: 'Consent',
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
   * Revoke consent (GDPR right to withdraw).
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

    // Audit log
    await this.auditService.log({
      userId: userId,
      action: 'CONSENT_REVOKED',
      entityType: 'Consent',
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
   * Get all consents for a user (for GDPR data export).
   */
  async getUserConsents(userId: string) {
    return this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
