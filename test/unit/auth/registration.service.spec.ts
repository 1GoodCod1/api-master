import { UserRole } from '@prisma/client';
import { AppErrorMessages } from '../../../src/common/errors';
import { RegistrationService } from '../../../src/modules/auth/auth/services/registration.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { TokenService } from '../../../src/modules/auth/auth/services/token.service';
import type { CacheService } from '../../../src/modules/shared/cache/cache.service';
import type { NotificationEventEmitter } from '../../../src/modules/notifications/events';
import type { EmailDripService } from '../../../src/modules/email/email-drip.service';
import type { ReferralsService } from '../../../src/modules/engagement/referrals/referrals.service';
import type { AuditService } from '../../../src/modules/audit/audit.service';
import type { ConsentService } from '../../../src/modules/consent/services/consent.service';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('RegistrationService', () => {
  const prisma = {
    user: { findFirst: jest.fn(), create: jest.fn() },
    city: { findFirst: jest.fn(), findMany: jest.fn() },
    category: { findFirst: jest.fn(), findMany: jest.fn() },
    master: { create: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const tokenService = {
    generateAccessToken: jest.fn().mockReturnValue('at'),
    generateRefreshToken: jest.fn().mockResolvedValue('rt'),
  };

  const cache = {
    invalidate: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    patterns: {
      mastersNew: jest.fn().mockReturnValue('masters:new'),
      categoriesAll: jest.fn().mockReturnValue('categories:all'),
    },
    keys: { searchFilters: jest.fn().mockReturnValue('search:filters') },
  };

  const notificationEvents = {
    notifyNewRegistration: jest.fn(),
  };

  const emailDripService = {
    startChain: jest.fn().mockResolvedValue(undefined),
  };

  const referralsService = {
    applyReferralCode: jest.fn().mockResolvedValue(undefined),
  };

  const auditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const consentService = {
    grantConsent: jest.fn().mockResolvedValue(undefined),
  };

  let service: RegistrationService;

  const clientDto = {
    email: 'client@example.com',
    phone: '+37360000000',
    password: 'SecurePass1!',
    role: UserRole.CLIENT,
    acceptedAge: true,
    acceptedLegal: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RegistrationService(
      prisma as unknown as PrismaService,
      tokenService as unknown as TokenService,
      cache as unknown as CacheService,
      notificationEvents as unknown as NotificationEventEmitter,
      emailDripService as unknown as EmailDripService,
      referralsService as unknown as ReferralsService,
      auditService as unknown as AuditService,
      consentService as unknown as ConsentService,
    );
  });

  describe('getRegistrationOptions', () => {
    it('maps cities and categories for UI selects', async () => {
      prisma.city.findMany.mockResolvedValue([
        { name: 'Chișinău', slug: 'chisinau' },
      ]);
      prisma.category.findMany.mockResolvedValue([
        { name: 'Plumbing', slug: 'plumbing', icon: 'wrench' },
      ]);

      const r = await service.getRegistrationOptions();

      expect(r.cities).toEqual([
        { name: 'Chișinău', slug: 'chisinau', value: 'chisinau' },
      ]);
      expect(r.categories).toEqual([
        {
          name: 'Plumbing',
          slug: 'plumbing',
          icon: 'wrench',
          value: 'plumbing',
        },
      ]);
    });
  });

  describe('register', () => {
    it('rejects MASTER without required fields', async () => {
      await expect(
        service.register({
          ...clientDto,
          role: UserRole.MASTER,
          city: undefined,
          category: 'x',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: AppErrorMessages.REG_MASTER_FIELDS_REQUIRED,
        }),
      });
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('rejects when age not accepted', async () => {
      await expect(
        service.register({ ...clientDto, acceptedAge: false }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: AppErrorMessages.REG_AGE_CONFIRM,
        }),
      });
    });

    it('rejects when email or phone already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.register(clientDto)).rejects.toMatchObject({
        response: expect.objectContaining({
          message: AppErrorMessages.REG_USER_EXISTS,
        }),
      });
    });

    it('registers CLIENT, grants consents, returns tokens', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u-new',
        email: clientDto.email,
        phone: clientDto.phone,
        role: UserRole.CLIENT,
        isVerified: false,
        firstName: null,
        lastName: null,
      });

      const result = await service.register(clientDto, '1.1.1.1', 'jest');

      expect(result).toMatchObject({
        accessToken: 'at',
        refreshToken: 'rt',
        user: expect.objectContaining({
          id: 'u-new',
          role: UserRole.CLIENT,
        }),
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: clientDto.email,
          role: UserRole.CLIENT,
          password: 'hashed-password',
        }),
      });
      expect(consentService.grantConsent).toHaveBeenCalledTimes(3);
      expect(notificationEvents.notifyNewRegistration).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
    });
  });
});
