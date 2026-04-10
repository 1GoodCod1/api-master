import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersGdprService } from '../../../src/modules/users/services/users-gdpr.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { CacheService } from '../../../src/modules/shared/cache/cache.service';

describe('UsersGdprService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    master: {
      findUnique: jest.fn(),
    },
    lead: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    review: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    booking: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    loginHistory: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    notification: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    userConsent: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const cache = {
    del: jest.fn().mockResolvedValue(undefined),
    invalidateUser: jest.fn().mockResolvedValue(undefined),
    keys: {
      userMasterProfile: (id: string) => `cache:user:${id}:master-profile`,
      userProfile: (id: string) => `cache:user:${id}:profile`,
    },
  } as unknown as CacheService;

  const eventEmitter = {
    emit: jest.fn(),
  };

  let service: UsersGdprService;

  const baseUserRow = {
    email: 'a@b.c',
    phone: '+100',
    firstName: 'A',
    lastName: 'B',
    role: 'CLIENT',
    isVerified: true,
    preferredLanguage: 'en',
    createdAt: new Date('2020-01-01T00:00:00.000Z'),
    updatedAt: new Date('2021-01-01T00:00:00.000Z'),
    lastLoginAt: null as Date | null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.lead.findMany.mockResolvedValue([]);
    prisma.review.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.loginHistory.findMany.mockResolvedValue([]);
    prisma.notification.findMany.mockResolvedValue([]);
    prisma.userConsent.findMany.mockResolvedValue([]);
    service = new UsersGdprService(
      prisma as unknown as PrismaService,
      cache,
      eventEmitter as never,
    );
  });

  describe('removeSelf', () => {
    it('throws NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.removeSelf('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for ADMIN role', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'ADMIN',
      } as never);

      await expect(service.removeSelf('u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('deletes user and invalidates cache', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'CLIENT',
      } as never);
      prisma.user.delete.mockResolvedValue({} as never);

      await expect(service.removeSelf('u1')).resolves.toEqual({ ok: true });

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
      expect(cache.invalidateUser).toHaveBeenCalledWith('u1');
    });
  });

  describe('getPersonalDataForPdf', () => {
    it('throws NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getPersonalDataForPdf('u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns export payload for CLIENT without master profile', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUserRow as never);
      prisma.master.findUnique.mockResolvedValue(null);

      const data = await service.getPersonalDataForPdf('u1');

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: 'u1' },
        }),
      );
      expect(data.user.email).toBe('a@b.c');
      expect(data.masterProfile).toBeNull();
      expect(data.leads).toEqual([]);
      expect(data.consents).toEqual([]);
      expect(data.exportDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('uses master-scoped queries for MASTER with profile', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseUserRow,
        role: 'MASTER',
      } as never);
      prisma.master.findUnique.mockResolvedValue({
        id: 'm1',
        description: 'Desc',
        experienceYears: 3,
        whatsappPhone: '+200',
        createdAt: new Date('2019-06-01T00:00:00.000Z'),
        city: { name: 'Chișinău' },
        category: { name: 'Plumber' },
      } as never);

      await service.getPersonalDataForPdf('u1');

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { masterId: 'm1' },
        }),
      );
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { masterId: 'm1' },
        }),
      );
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { masterId: 'm1' },
        }),
      );
    });
  });
});
