import { ComplianceService } from '../../../src/modules/compliance/services/compliance.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { ConfigService } from '@nestjs/config';

describe('ComplianceService', () => {
  const prisma = {
    user: { count: jest.fn() },
    master: { count: jest.fn() },
    lead: { count: jest.fn() },
    booking: { count: jest.fn() },
    review: { count: jest.fn() },
    masterVerification: { count: jest.fn() },
    userConsent: { count: jest.fn() },
    auditLog: { count: jest.fn() },
  };

  const config = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const map: Record<string, string> = {
        ORGANIZATION_NAME: 'Test Org',
        ORGANIZATION_ADDRESS: 'Test City',
        DPO_NAME: 'DPO Name',
        DPO_EMAIL: 'dpo@example.com',
      };
      return map[key] ?? defaultValue;
    }),
  } as unknown as ConfigService;

  let service: ComplianceService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.count.mockResolvedValue(10);
    prisma.master.count.mockResolvedValue(5);
    prisma.lead.count.mockResolvedValue(20);
    prisma.booking.count.mockResolvedValue(7);
    prisma.review.count.mockResolvedValue(3);
    prisma.masterVerification.count.mockResolvedValue(2);
    prisma.userConsent.count.mockResolvedValue(40);
    prisma.auditLog.count.mockResolvedValue(100);

    service = new ComplianceService(prisma as unknown as PrismaService, config);
  });

  describe('getDpiaContext', () => {
    it('aggregates counts and compliance flags', async () => {
      prisma.masterVerification.count.mockResolvedValueOnce(9);

      const ctx = await service.getDpiaContext();

      expect(prisma.user.count).toHaveBeenCalled();
      expect(prisma.masterVerification.count).toHaveBeenCalledWith({
        where: { status: 'APPROVED' },
      });
      expect(ctx.organizationName).toBe('Test Org');
      expect(ctx.dpoEmail).toBe('dpo@example.com');
      expect(ctx.totalUsers).toBe(10);
      expect(ctx.verifiedDocumentsCount).toBe(9);
      expect(ctx.encryptionEnabled).toBe(true);
      expect(ctx.twoFactorAvailable).toBe(true);
    });
  });

  describe('getRopaContext', () => {
    it('includes organization address from config', async () => {
      const ctx = await service.getRopaContext();

      expect(ctx.organizationAddress).toBe('Test City');
      expect(ctx.totalMasters).toBe(5);
    });
  });

  describe('getComplianceOverview', () => {
    it('returns dashboard aggregates', async () => {
      prisma.masterVerification.count.mockResolvedValueOnce(4);

      const overview = await service.getComplianceOverview();

      expect(overview.totalUsers).toBe(10);
      expect(overview.totalConsents).toBe(40);
      expect(overview.pendingVerifications).toBe(4);
      expect(overview.dpiaAvailable).toBe(true);
      expect(overview.ropaAvailable).toBe(true);
      expect(overview).not.toHaveProperty('lastGenerated');

      expect(prisma.masterVerification.count).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
      });
    });
  });
});
