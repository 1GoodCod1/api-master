import { Injectable } from '@nestjs/common';
import type { ConsentType, UserConsent } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import type {
  GrantConsentInput,
  IConsentRepository,
} from './consent.repository';

@Injectable()
export class PrismaConsentRepository implements IConsentRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertGranted(input: GrantConsentInput): Promise<UserConsent> {
    const { userId, consentType, ipAddress, userAgent, version } = input;
    return this.prisma.userConsent.upsert({
      where: { userId_consentType: { userId, consentType } },
      create: {
        userId,
        consentType,
        granted: true,
        ipAddress,
        userAgent,
        version,
      },
      update: {
        granted: true,
        ipAddress,
        userAgent,
        version,
        revokedAt: null,
      },
    });
  }

  markRevoked(userId: string, consentType: ConsentType): Promise<UserConsent> {
    return this.prisma.userConsent.update({
      where: { userId_consentType: { userId, consentType } },
      data: { granted: false, revokedAt: new Date() },
    });
  }

  findByUserAndType(
    userId: string,
    consentType: ConsentType,
  ): Promise<UserConsent | null> {
    return this.prisma.userConsent.findUnique({
      where: { userId_consentType: { userId, consentType } },
    });
  }

  findAllByUser(userId: string): Promise<UserConsent[]> {
    return this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
