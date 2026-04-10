import { ConsentService } from '../../../src/modules/consent/services/consent.service';
import { ConsentType } from '../../../src/modules/consent/dto/grant-consent.dto';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';

describe('ConsentService', () => {
  const userConsent = {
    upsert: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };

  const prisma = {
    userConsent,
  } as unknown as PrismaService;

  const eventEmitter = {
    emit: jest.fn(),
  };

  let service: ConsentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConsentService(prisma, eventEmitter as never);
  });

  describe('grantConsent', () => {
    it('upserts consent with meta and default version', async () => {
      const row = {
        id: 'c1',
        userId: 'u1',
        consentType: ConsentType.PRIVACY_POLICY,
      };
      userConsent.upsert.mockResolvedValue(row as never);

      const result = await service.grantConsent(
        'u1',
        ConsentType.PRIVACY_POLICY,
        {
          ipAddress: '1.2.3.4',
          userAgent: 'jest',
          version: '2.0',
        },
      );

      expect(userConsent.upsert).toHaveBeenCalledWith({
        where: {
          userId_consentType: {
            userId: 'u1',
            consentType: ConsentType.PRIVACY_POLICY,
          },
        },
        create: {
          userId: 'u1',
          consentType: ConsentType.PRIVACY_POLICY,
          granted: true,
          ipAddress: '1.2.3.4',
          userAgent: 'jest',
          version: '2.0',
        },
        update: {
          granted: true,
          ipAddress: '1.2.3.4',
          userAgent: 'jest',
          version: '2.0',
          revokedAt: null,
        },
      });
      expect(result).toBe(row);
    });

    it('defaults version to 1.0 when omitted', async () => {
      userConsent.upsert.mockResolvedValue({} as never);

      await service.grantConsent('u1', ConsentType.MARKETING, {});

      expect(userConsent.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ version: '1.0' }),
          update: expect.objectContaining({ version: '1.0' }),
        }),
      );
    });
  });

  describe('revokeConsent', () => {
    it('sets granted false and revokedAt', async () => {
      const row = { id: 'c1', granted: false };
      userConsent.update.mockResolvedValue(row as never);

      const result = await service.revokeConsent(
        'u1',
        ConsentType.TERMS_OF_SERVICE,
      );

      expect(userConsent.update).toHaveBeenCalledWith({
        where: {
          userId_consentType: {
            userId: 'u1',
            consentType: ConsentType.TERMS_OF_SERVICE,
          },
        },
        data: {
          granted: false,
          revokedAt: expect.any(Date),
        },
      });
      expect(result).toBe(row);
    });
  });

  describe('hasConsent', () => {
    it('returns true when granted and not revoked', async () => {
      userConsent.findUnique.mockResolvedValue({
        granted: true,
        revokedAt: null,
      } as never);

      await expect(
        service.hasConsent('u1', ConsentType.VERIFICATION_DATA_PROCESSING),
      ).resolves.toBe(true);
    });

    it('returns false when missing', async () => {
      userConsent.findUnique.mockResolvedValue(null);

      await expect(
        service.hasConsent('u1', ConsentType.PRIVACY_POLICY),
      ).resolves.toBe(false);
    });

    it('returns false when revoked', async () => {
      userConsent.findUnique.mockResolvedValue({
        granted: true,
        revokedAt: new Date(),
      } as never);

      await expect(
        service.hasConsent('u1', ConsentType.PRIVACY_POLICY),
      ).resolves.toBe(false);
    });

    it('returns false when not granted', async () => {
      userConsent.findUnique.mockResolvedValue({
        granted: false,
        revokedAt: null,
      } as never);

      await expect(
        service.hasConsent('u1', ConsentType.MARKETING),
      ).resolves.toBe(false);
    });
  });

  describe('getUserConsents', () => {
    it('returns ordered consents', async () => {
      const rows = [{ id: 'c1' }];
      userConsent.findMany.mockResolvedValue(rows as never);

      const result = await service.getUserConsents('u1');

      expect(userConsent.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toBe(rows);
    });
  });
});
