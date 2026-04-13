import type { ConsentType, UserConsent } from '@prisma/client';

export const CONSENT_REPOSITORY = Symbol('CONSENT_REPOSITORY');

export interface GrantConsentInput {
  userId: string;
  consentType: ConsentType;
  ipAddress: string | null;
  userAgent: string | null;
  version: string;
}

export interface IConsentRepository {
  upsertGranted(input: GrantConsentInput): Promise<UserConsent>;
  markRevoked(userId: string, consentType: ConsentType): Promise<UserConsent>;
  findByUserAndType(
    userId: string,
    consentType: ConsentType,
  ): Promise<UserConsent | null>;
  findAllByUser(userId: string): Promise<UserConsent[]>;
}
