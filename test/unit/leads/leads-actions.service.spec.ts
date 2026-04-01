import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

jest.mock(
  '../../../src/modules/engagement/referrals/referrals.service',
  () => ({
    ReferralsService: jest.fn().mockImplementation(() => ({
      qualifyReferral: jest.fn().mockResolvedValue(undefined),
    })),
  }),
);

import { LeadsActionsService } from '../../../src/modules/marketplace/leads/services/leads-actions.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { CacheService } from '../../../src/modules/shared/cache/cache.service';
import type { InAppNotificationService } from '../../../src/modules/notifications/notifications/services/in-app-notification.service';
import type { MastersAvailabilityService } from '../../../src/modules/marketplace/masters/services/masters-availability.service';
import type { EmailDripService } from '../../../src/modules/email/email-drip.service';
import type { ReferralsService } from '../../../src/modules/engagement/referrals/referrals.service';
import type { JwtUser } from '../../../src/common/interfaces/jwt-user.interface';

type PrismaLeadsActionsMock = {
  lead: { findUnique: jest.Mock; update: jest.Mock };
  master: { findUnique: jest.Mock };
  masterAvailabilitySubscription: { findMany: jest.Mock; update: jest.Mock };
};

describe('LeadsActionsService', () => {
  const prisma: PrismaLeadsActionsMock = {
    lead: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    master: {
      findUnique: jest.fn(),
    },
    masterAvailabilitySubscription: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const cache = {
    invalidate: jest.fn(),
    del: jest.fn(),
    invalidateMasterData: jest.fn().mockResolvedValue(undefined),
    keys: {
      masterStats: jest.fn(
        (masterId: string) => `cache:master:${masterId}:stats`,
      ),
    },
  } as unknown as jest.Mocked<CacheService>;

  const inAppNotifications = {
    notifyMasterAvailable: jest.fn(),
    notifyLeadStatusUpdated: jest.fn().mockResolvedValue(undefined),
    notify: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<InAppNotificationService>;

  const availabilityService = {
    decrementActiveLeads: jest.fn(),
  } as unknown as jest.Mocked<MastersAvailabilityService>;

  const emailDripService = {
    startChain: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<EmailDripService>;

  const referralsService = {
    qualifyReferral: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ReferralsService>;

  let service: LeadsActionsService;

  const masterUser: JwtUser = {
    id: 'u1',
    role: 'MASTER',
    phoneVerified: true,
    isVerified: true,
    masterProfile: { id: 'm1' } as never,
  };

  /** Клиент подтверждает закрытие: PENDING_CLOSE → CLOSED (мастер так сделать не может). */
  const clientUser: JwtUser = {
    id: 'c1',
    role: 'CLIENT',
    phoneVerified: true,
    isVerified: true,
    masterProfile: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeadsActionsService(
      prisma as unknown as PrismaService,
      cache,
      inAppNotifications,
      availabilityService,
      emailDripService,
      referralsService,
    );
  });

  it('throws NotFoundException when lead does not exist', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);

    await expect(
      service.updateStatus('lead-1', masterUser, { status: 'CLOSED' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ForbiddenException when master tries to update non-owned lead', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      masterId: 'another-master',
      status: 'NEW',
    } as never);

    await expect(
      service.updateStatus('lead-1', masterUser, { status: 'CLOSED' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws BadRequestException for invalid status transition', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      masterId: 'm1',
      status: 'NEW',
    } as never);

    await expect(
      service.updateStatus('lead-1', masterUser, { status: 'NEW' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it('updates status, updates availability and invalidates cache on client PENDING_CLOSE to CLOSED', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      masterId: 'm1',
      clientId: 'c1',
      status: 'PENDING_CLOSE',
    } as never);
    prisma.lead.update.mockResolvedValue({
      id: 'lead-1',
      masterId: 'm1',
      clientId: 'c1',
      status: 'CLOSED',
    } as never);
    availabilityService.decrementActiveLeads.mockResolvedValue({
      id: 'm1',
      availabilityStatus: 'AVAILABLE',
    } as never);
    prisma.master.findUnique.mockResolvedValue({
      id: 'm1',
      user: { firstName: 'John', lastName: 'Doe' },
    } as never);
    prisma.masterAvailabilitySubscription.findMany.mockResolvedValue([
      { id: 's1', clientId: 'c1' },
    ] as never);
    inAppNotifications.notifyMasterAvailable.mockResolvedValue({} as never);
    prisma.masterAvailabilitySubscription.update.mockResolvedValue({} as never);

    await service.updateStatus('lead-1', clientUser, { status: 'CLOSED' });

    expect(availabilityService.decrementActiveLeads).toHaveBeenCalledWith('m1');
    expect(cache.invalidateMasterData).toHaveBeenCalledWith('m1');
    expect(inAppNotifications.notifyMasterAvailable).toHaveBeenCalledWith(
      'c1',
      {
        masterId: 'm1',
        masterName: 'John Doe',
      },
    );
  });

  it('triggers referral qualification and email drip with master context when client confirms CLOSED', async () => {
    const closingClient: JwtUser = {
      id: 'client-1',
      role: 'CLIENT',
      phoneVerified: true,
      isVerified: true,
      masterProfile: null,
    };
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-2',
      masterId: 'm1',
      clientId: 'client-1',
      status: 'PENDING_CLOSE',
    } as never);
    prisma.lead.update.mockResolvedValue({
      id: 'lead-2',
      masterId: 'm1',
      clientId: 'client-1',
      status: 'CLOSED',
    } as never);
    availabilityService.decrementActiveLeads.mockResolvedValue({
      id: 'm1',
      availabilityStatus: 'BUSY',
    } as never);
    prisma.master.findUnique.mockResolvedValue({
      id: 'm1',
      user: { firstName: 'John', lastName: 'Doe' },
    } as never);

    await service.updateStatus('lead-2', closingClient, { status: 'CLOSED' });

    expect(referralsService.qualifyReferral).toHaveBeenCalledWith('client-1');
    expect(emailDripService.startChain).toHaveBeenCalledWith(
      'client-1',
      'lead_closed',
      { masterName: 'John Doe' },
    );
  });
});
