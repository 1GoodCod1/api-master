import { ConsentService } from '../../../src/modules/consent/services/consent.service';
import { ConsentType } from '../../../src/modules/consent/dto/grant-consent.dto';
import type { IConsentRepository } from '../../../src/modules/consent/repositories/consent.repository';

describe('ConsentService', () => {
  const repo: jest.Mocked<IConsentRepository> = {
    upsertGranted: jest.fn(),
    markRevoked: jest.fn(),
    findByUserAndType: jest.fn(),
    findAllByUser: jest.fn(),
  };

  const eventEmitter = { emit: jest.fn() };

  let service: ConsentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConsentService(repo, eventEmitter as never);
  });

  describe('grantConsent', () => {
    it('delegates to repo with normalized meta', async () => {
      const row = { id: 'c1' } as never;
      repo.upsertGranted.mockResolvedValue(row);

      const result = await service.grantConsent(
        'u1',
        ConsentType.PRIVACY_POLICY,
        { ipAddress: '1.2.3.4', userAgent: 'jest', version: '2.0' },
      );

      expect(repo.upsertGranted).toHaveBeenCalledWith({
        userId: 'u1',
        consentType: ConsentType.PRIVACY_POLICY,
        ipAddress: '1.2.3.4',
        userAgent: 'jest',
        version: '2.0',
      });
      expect(result).toBe(row);
    });

    it('defaults version to 1.0 and nulls missing meta', async () => {
      repo.upsertGranted.mockResolvedValue({} as never);

      await service.grantConsent('u1', ConsentType.MARKETING, {});

      expect(repo.upsertGranted).toHaveBeenCalledWith({
        userId: 'u1',
        consentType: ConsentType.MARKETING,
        ipAddress: null,
        userAgent: null,
        version: '1.0',
      });
    });
  });

  describe('revokeConsent', () => {
    it('delegates to repo.markRevoked', async () => {
      const row = { id: 'c1', granted: false } as never;
      repo.markRevoked.mockResolvedValue(row);

      const result = await service.revokeConsent(
        'u1',
        ConsentType.TERMS_OF_SERVICE,
      );

      expect(repo.markRevoked).toHaveBeenCalledWith(
        'u1',
        ConsentType.TERMS_OF_SERVICE,
      );
      expect(result).toBe(row);
    });
  });

  describe('hasConsent', () => {
    it('true when granted and not revoked', async () => {
      repo.findByUserAndType.mockResolvedValue({
        granted: true,
        revokedAt: null,
      } as never);

      await expect(
        service.hasConsent('u1', ConsentType.VERIFICATION_DATA_PROCESSING),
      ).resolves.toBe(true);
    });

    it('false when missing', async () => {
      repo.findByUserAndType.mockResolvedValue(null);
      await expect(
        service.hasConsent('u1', ConsentType.PRIVACY_POLICY),
      ).resolves.toBe(false);
    });

    it('false when revoked', async () => {
      repo.findByUserAndType.mockResolvedValue({
        granted: true,
        revokedAt: new Date(),
      } as never);
      await expect(
        service.hasConsent('u1', ConsentType.PRIVACY_POLICY),
      ).resolves.toBe(false);
    });

    it('false when not granted', async () => {
      repo.findByUserAndType.mockResolvedValue({
        granted: false,
        revokedAt: null,
      } as never);
      await expect(
        service.hasConsent('u1', ConsentType.MARKETING),
      ).resolves.toBe(false);
    });
  });

  describe('getUserConsents', () => {
    it('delegates to repo.findAllByUser', async () => {
      const rows = [{ id: 'c1' }] as never;
      repo.findAllByUser.mockResolvedValue(rows);

      const result = await service.getUserConsents('u1');

      expect(repo.findAllByUser).toHaveBeenCalledWith('u1');
      expect(result).toBe(rows);
    });
  });
});
