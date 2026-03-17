import { NotFoundException } from '@nestjs/common';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { NotificationsActionService } from '../../../src/modules/notifications/notifications/services/notifications-action.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';

type PrismaNotificationsActionMock = {
  notification: {
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
};

describe('NotificationsActionService', () => {
  const prisma: PrismaNotificationsActionMock = {
    notification: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  let service: NotificationsActionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsActionService(
      prisma as unknown as PrismaService,
    );
  });

  describe('markAsRead', () => {
    it('throws NotFoundException when notification not found', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('u1', 'n1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns existing notification when already read', async () => {
      const notification = { id: 'n1', readAt: new Date() };
      prisma.notification.findFirst.mockResolvedValue(notification);

      const result = await service.markAsRead('u1', 'n1');

      expect(result).toEqual(notification);
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('updates notification when unread', async () => {
      const updated = { id: 'n1', readAt: new Date() };
      prisma.notification.findFirst.mockResolvedValue({
        id: 'n1',
        readAt: null,
      });
      prisma.notification.update.mockResolvedValue(updated);

      const result = await service.markAsRead('u1', 'n1');

      expect(result).toEqual(updated);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      });
    });
  });

  describe('markAllAsRead', () => {
    it('updates multiple notifications', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('u1');

      expect(result).toEqual({ updated: 5 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', readAt: null },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      });
    });
  });

  describe('deleteNotification', () => {
    it('throws NotFoundException when notification not found', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteNotification('u1', 'n1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes notification when found', async () => {
      prisma.notification.findFirst.mockResolvedValue({
        id: 'n1',
        userId: 'u1',
      });
      prisma.notification.delete.mockResolvedValue({} as never);

      const result = await service.deleteNotification('u1', 'n1');

      expect(result).toEqual({ deleted: true });
      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'n1' },
      });
    });
  });

  describe('deleteAllNotifications', () => {
    it('deletes all user notifications', async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.deleteAllNotifications('u1');

      expect(result).toEqual({ deleted: 3 });
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
    });
  });

  describe('saveNotification', () => {
    it('creates notification with params', async () => {
      const type = 'LEAD' as NotificationType;
      const created = {
        id: 'n1',
        type,
        message: 'New lead',
        status: NotificationStatus.SENT,
      };
      prisma.notification.create.mockResolvedValue(created);

      const result = await service.saveNotification({
        type,
        recipient: 'u1',
        message: 'New lead',
        status: NotificationStatus.SENT,
        userId: 'u1',
      });

      expect(result).toEqual(created);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'LEAD',
          message: 'New lead',
          status: NotificationStatus.SENT,
          userId: 'u1',
        }),
      });
    });
  });
});
