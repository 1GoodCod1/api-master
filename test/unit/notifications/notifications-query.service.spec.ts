import { NotificationsQueryService } from '../../../src/modules/notifications/notifications/services/notifications-query.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';

type PrismaNotificationsQueryMock = {
  notification: { findMany: jest.Mock; count: jest.Mock };
  $queryRaw: jest.Mock;
};

describe('NotificationsQueryService', () => {
  const prisma: PrismaNotificationsQueryMock = {
    notification: { findMany: jest.fn(), count: jest.fn() },
    $queryRaw: jest.fn(),
  };

  let service: NotificationsQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsQueryService(prisma as unknown as PrismaService);
  });

  describe('getUserNotifications', () => {
    it('returns paginated notifications', async () => {
      const notifications = [
        { id: 'n1', createdAt: new Date(), userId: 'u1' },
        { id: 'n2', createdAt: new Date(), userId: 'u1' },
      ];
      prisma.notification.findMany.mockResolvedValue(notifications);
      prisma.notification.count.mockResolvedValue(2);

      const result = await service.getUserNotifications('u1', {
        limit: 50,
        page: 1,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toBeDefined();
    });
  });

  describe('getUnreadCount', () => {
    it('returns count and byCategory', async () => {
      prisma.notification.count.mockResolvedValue(5);
      prisma.$queryRaw.mockResolvedValue([
        { category: 'LEAD', count: BigInt(3) },
        { category: 'REVIEW', count: BigInt(2) },
      ]);

      const result = await service.getUnreadCount('u1');

      expect(result.count).toBe(5);
      expect(result.byCategory).toEqual({ LEAD: 3, REVIEW: 2 });
    });
  });
});
