import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LeadsValidationService } from '../../../src/modules/leads/services/leads-validation.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';

type PrismaLeadsValidationMock = {
  master: { findUnique: jest.Mock; update: jest.Mock };
  lead: { findFirst: jest.Mock };
  file: { findMany: jest.Mock };
};

describe('LeadsValidationService', () => {
  const prisma: PrismaLeadsValidationMock = {
    master: { findUnique: jest.fn(), update: jest.fn() },
    lead: { findFirst: jest.fn() },
    file: { findMany: jest.fn() },
  };

  let service: LeadsValidationService;

  const validMaster = {
    id: 'm1',
    userId: 'u-master',
    availabilityStatus: 'AVAILABLE',
    currentActiveLeads: 2,
    maxActiveLeads: 5,
    leadsReceivedToday: 1,
    maxLeadsPerDay: 10,
    leadsResetAt: new Date(),
    user: { id: 'u-master', isVerified: true },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeadsValidationService(prisma as unknown as PrismaService);
  });

  describe('validateCreate', () => {
    it('throws NotFoundException when master not found', async () => {
      prisma.master.findUnique.mockResolvedValue(null);

      await expect(
        service.validateCreate('m1', {
          id: 'c1',
          role: 'CLIENT',
          phoneVerified: true,
        } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when client sends lead to self', async () => {
      prisma.master.findUnique.mockResolvedValue({
        ...validMaster,
        userId: 'c1',
      });

      await expect(
        service.validateCreate('m1', {
          id: 'c1',
          role: 'CLIENT',
          phoneVerified: true,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ForbiddenException when user not authorized or not CLIENT', async () => {
      prisma.master.findUnique.mockResolvedValue(validMaster);

      await expect(
        service.validateCreate('m1', undefined),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when phone not verified', async () => {
      prisma.master.findUnique.mockResolvedValue(validMaster);

      await expect(
        service.validateCreate('m1', {
          id: 'c1',
          role: 'CLIENT',
          phoneVerified: false,
        } as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequestException when master is BUSY', async () => {
      prisma.master.findUnique.mockResolvedValue({
        ...validMaster,
        availabilityStatus: 'BUSY',
      });

      await expect(
        service.validateCreate('m1', {
          id: 'c1',
          role: 'CLIENT',
          phoneVerified: true,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when max active leads reached', async () => {
      prisma.master.findUnique.mockResolvedValue({
        ...validMaster,
        currentActiveLeads: 5,
        maxActiveLeads: 5,
      });

      await expect(
        service.validateCreate('m1', {
          id: 'c1',
          role: 'CLIENT',
          phoneVerified: true,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when client has existing open lead', async () => {
      prisma.master.findUnique.mockResolvedValue(validMaster);
      prisma.master.update.mockResolvedValue(validMaster);
      prisma.lead.findFirst.mockResolvedValue({ id: 'l1', status: 'NEW' });

      await expect(
        service.validateCreate('m1', {
          id: 'c1',
          role: 'CLIENT',
          phoneVerified: true,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns master when validation passes', async () => {
      prisma.master.findUnique.mockResolvedValue(validMaster);
      prisma.master.update.mockResolvedValue(validMaster);
      prisma.lead.findFirst.mockResolvedValue(null);

      const result = await service.validateCreate('m1', {
        id: 'c1',
        role: 'CLIENT',
        phoneVerified: true,
      } as never);

      expect(result).toEqual(validMaster);
    });

    it('throws BadRequestException when too many files', async () => {
      prisma.master.findUnique.mockResolvedValue(validMaster);
      prisma.master.update.mockResolvedValue(validMaster);
      prisma.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.validateCreate(
          'm1',
          { id: 'c1', role: 'CLIENT', phoneVerified: true } as never,
          Array(11).fill('f1'),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
