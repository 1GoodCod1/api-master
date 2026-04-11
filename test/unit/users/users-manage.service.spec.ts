import { UserRole } from '@prisma/client';
import { AppErrorMessages } from '../../../src/common/errors';
import { UsersManageService } from '../../../src/modules/users/services/users-manage.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { CacheService } from '../../../src/modules/shared/cache/cache.service';

describe('UsersManageService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    master: { update: jest.fn() },
  };

  const cache = {
    invalidateUser: jest.fn().mockResolvedValue(undefined),
  };

  let service: UsersManageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersManageService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
    );
  });

  it('update throws when user missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.update('u1', { email: 'n@x.com' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: AppErrorMessages.USER_NOT_FOUND,
      }),
    });
  });

  it('update persists dto when user exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.user.update.mockResolvedValue({ id: 'u1', email: 'n@x.com' });
    const r = await service.update('u1', { email: 'n@x.com' });
    expect(r).toEqual({ id: 'u1', email: 'n@x.com' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { email: 'n@x.com' },
    });
  });

  it('remove deletes by id', async () => {
    prisma.user.delete.mockResolvedValue({ id: 'u1' });
    const r = await service.remove('u1');
    expect(r).toEqual({ id: 'u1' });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('toggleBan flips flag and invalidates cache', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isBanned: false });
    prisma.user.update.mockResolvedValue({ id: 'u1', isBanned: true });
    const r = await service.toggleBan('u1');
    expect(r.isBanned).toBe(true);
    expect(cache.invalidateUser).toHaveBeenCalledWith('u1');
  });

  it('toggleBan throws when user missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.toggleBan('u1')).rejects.toMatchObject({
      response: expect.objectContaining({
        message: AppErrorMessages.USER_NOT_FOUND,
      }),
    });
  });

  it('toggleVerify clears master pendingVerification when verifying MASTER', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      isVerified: false,
      role: UserRole.MASTER,
      masterProfile: { id: 'm1' },
    });
    prisma.user.update.mockResolvedValue({ id: 'u1', isVerified: true });
    prisma.master.update.mockResolvedValue({});

    const r = await service.toggleVerify('u1');

    expect(r.isVerified).toBe(true);
    expect(prisma.master.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { pendingVerification: false },
    });
    expect(cache.invalidateUser).toHaveBeenCalledWith('u1');
  });

  it('setPreferredLanguage updates user', async () => {
    prisma.user.update.mockResolvedValue({});
    await service.setPreferredLanguage('u1', 'ro');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { preferredLanguage: 'ro' },
    });
  });
});
