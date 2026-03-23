import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReviewStatus } from '@prisma/client';
import { ReviewsActionService } from '../../../src/modules/marketplace/reviews/services/reviews-action.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { CacheService } from '../../../src/modules/shared/cache/cache.service';
import type { InAppNotificationService } from '../../../src/modules/notifications/notifications/services/in-app-notification.service';
import type { NotificationsService } from '../../../src/modules/notifications/notifications/notifications.service';

type PrismaReviewsActionMock = {
  user: { findUnique: jest.Mock };
  master: { findUnique: jest.Mock; update: jest.Mock };
  review: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  lead: { findFirst: jest.Mock; findUnique: jest.Mock };
  reviewReply: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  reviewVote: {
    findUnique: jest.Mock;
    create: jest.Mock;
    count: jest.Mock;
    delete: jest.Mock;
  };
};

describe('ReviewsActionService', () => {
  const prisma: PrismaReviewsActionMock = {
    user: { findUnique: jest.fn() },
    master: { findUnique: jest.fn(), update: jest.fn() },
    review: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    lead: { findFirst: jest.fn(), findUnique: jest.fn() },
    reviewReply: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    reviewVote: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
  };

  const cache = {
    invalidate: jest.fn(),
    del: jest.fn(),
    invalidateMasterRelated: jest.fn().mockResolvedValue(undefined),
    keys: { masterStats: jest.fn((id: string) => `cache:master:${id}:stats`) },
  } as unknown as jest.Mocked<CacheService>;

  const inAppNotifications = {
    notifyNewReview: jest.fn(),
    notify: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<InAppNotificationService>;

  const notifications = {
    sendSMS: jest.fn(),
    sendTelegram: jest.fn(),
    sendWhatsApp: jest.fn(),
  } as unknown as jest.Mocked<NotificationsService>;

  let service: ReviewsActionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReviewsActionService(
      prisma as unknown as PrismaService,
      cache,
      inAppNotifications,
      notifications,
    );
  });

  describe('create', () => {
    it('throws BadRequestException when user or phone not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { masterId: 'm1', leadId: 'l1', rating: 5, criteria: [] },
          'c1',
          {
            id: 'c1',
            role: 'CLIENT',
            phoneVerified: true,
          } as never,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ForbiddenException when client phone not verified', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'c1',
        phone: '+37312345678',
      });
      prisma.master.findUnique.mockResolvedValue({ id: 'm1', userId: 'u1' });

      await expect(
        service.create(
          { masterId: 'm1', leadId: 'l1', rating: 5, criteria: [] },
          'c1',
          {
            id: 'c1',
            role: 'CLIENT',
            phoneVerified: false,
          } as never,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when master not found', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'c1',
        phone: '+37312345678',
      });
      prisma.master.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { masterId: 'm1', leadId: 'l1', rating: 5, criteria: [] },
          'c1',
          {
            id: 'c1',
            role: 'CLIENT',
            phoneVerified: true,
          } as never,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when duplicate review exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'c1',
        phone: '+37312345678',
      });
      prisma.master.findUnique.mockResolvedValue({ id: 'm1', userId: 'u1' });
      prisma.review.findFirst.mockResolvedValue({ id: 'r1' });

      await expect(
        service.create(
          { masterId: 'm1', leadId: 'l1', rating: 5, criteria: [] },
          'c1',
          {
            id: 'c1',
            role: 'CLIENT',
            phoneVerified: true,
          } as never,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when no closed lead', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'c1',
        phone: '+37312345678',
      });
      prisma.master.findUnique.mockResolvedValue({ id: 'm1', userId: 'u1' });
      prisma.review.findFirst.mockResolvedValue(null);
      prisma.lead.findUnique.mockResolvedValue({
        id: 'l1',
        masterId: 'm1',
        clientId: 'c1',
        clientPhone: '+37312345678',
        status: 'IN_PROGRESS',
        clientName: 'Test',
      });

      await expect(
        service.create(
          { masterId: 'm1', leadId: 'l1', rating: 5, criteria: [] },
          'c1',
          {
            id: 'c1',
            role: 'CLIENT',
            phoneVerified: true,
          } as never,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException when review not found', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('r1', ReviewStatus.VISIBLE),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates status and invalidates cache', async () => {
      const updated = {
        id: 'r1',
        masterId: 'm1',
        status: ReviewStatus.VISIBLE,
      };
      prisma.review.findUnique.mockResolvedValue({ id: 'r1', masterId: 'm1' });
      prisma.review.update.mockResolvedValue(updated);
      prisma.review.findMany.mockResolvedValue([{ rating: 5 }]);
      prisma.master.findUnique.mockResolvedValue({ userId: 'u1' });

      await service.updateStatus('r1', ReviewStatus.VISIBLE);

      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: expect.objectContaining({ status: ReviewStatus.VISIBLE }),
      });
      expect(inAppNotifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          category: 'NEW_REVIEW',
          metadata: expect.objectContaining({
            reviewId: 'r1',
            status: 'VISIBLE',
          }),
        }),
      );
    });
  });

  describe('replyToReview', () => {
    it('throws NotFoundException when review not found', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(
        service.replyToReview('r1', 'm1', 'Thanks!'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when master does not own review', async () => {
      prisma.review.findUnique.mockResolvedValue({
        id: 'r1',
        masterId: 'm-other',
      });

      await expect(
        service.replyToReview('r1', 'm1', 'Thanks!'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('voteHelpful', () => {
    it('throws NotFoundException when review not found', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(service.voteHelpful('r1', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws BadRequestException when user already voted', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'r1' });
      prisma.reviewVote.findUnique.mockResolvedValue({
        reviewId: 'r1',
        userId: 'u1',
      });

      await expect(service.voteHelpful('r1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
