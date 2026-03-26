import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { LoginService } from '../../../src/modules/auth/auth/services/login.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { TokenService } from '../../../src/modules/auth/auth/services/token.service';
import type { CacheService } from '../../../src/modules/shared/cache/cache.service';

jest.mock('argon2', () => ({
  verify: jest.fn(),
}));

type PrismaLoginMock = {
  user: { findUnique: jest.Mock; update: jest.Mock };
  ipBlacklist: { findFirst: jest.Mock };
  loginHistory: { create: jest.Mock };
  refreshToken: { deleteMany: jest.Mock };
  $transaction: jest.Mock;
};

describe('LoginService', () => {
  const prisma: PrismaLoginMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ipBlacklist: {
      findFirst: jest.fn(),
    },
    loginHistory: {
      create: jest.fn(),
    },
    refreshToken: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const tokenService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
  } as unknown as jest.Mocked<TokenService>;

  const cache = {
    del: jest.fn(),
    keys: {
      userProfile: jest.fn((id: string) => `user:${id}:profile`),
      userMasterProfile: jest.fn((id: string) => `user:${id}:master-profile`),
    },
  } as unknown as jest.Mocked<CacheService>;

  const lockout = {
    checkLocked: jest.fn().mockResolvedValue(undefined),
    recordFailed: jest.fn().mockResolvedValue(undefined),
    clearLockout: jest.fn().mockResolvedValue(undefined),
  };

  let service: LoginService;

  beforeEach(() => {
    jest.clearAllMocks();
    lockout.checkLocked.mockResolvedValue(undefined);
    lockout.recordFailed.mockResolvedValue(undefined);
    lockout.clearLockout.mockResolvedValue(undefined);
    service = new LoginService(
      prisma as unknown as PrismaService,
      tokenService,
      cache,
      lockout as never,
    );
  });

  it('throws UnauthorizedException for invalid password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      password: 'hash',
      role: 'MASTER',
      isVerified: false,
      phoneVerified: false,
      phone: null,
      isBanned: false,
      masterProfile: null,
    } as never);
    (argon2.verify as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login(
        { email: 'user@example.com', password: 'wrong' },
        '127.0.0.1',
        'jest',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(lockout.recordFailed).toHaveBeenCalledWith(
      'user@example.com',
      '127.0.0.1',
    );
    expect(prisma.loginHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        success: false,
        failReason: 'Invalid password',
      }),
    });
    expect(tokenService.generateAccessToken).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when IP is blacklisted', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      password: 'hash',
      role: 'MASTER',
      isVerified: false,
      phoneVerified: false,
      phone: null,
      isBanned: false,
      masterProfile: null,
    } as never);
    prisma.ipBlacklist.findFirst.mockResolvedValue({ id: 'blk-1' } as never);

    await expect(
      service.login(
        { email: 'user@example.com', password: 'password123' },
        '127.0.0.1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(argon2.verify).not.toHaveBeenCalled();
    expect(prisma.loginHistory.create).not.toHaveBeenCalled();
  });

  it('returns tokens and invalidates user cache on successful login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      password: 'hash',
      role: 'MASTER',
      isVerified: true,
      phoneVerified: true,
      phone: '+123',
      isBanned: false,
      masterProfile: { id: 'm1' },
    } as never);
    prisma.ipBlacklist.findFirst.mockResolvedValue(null);
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    tokenService.generateAccessToken.mockReturnValue('access-token');
    tokenService.generateRefreshToken.mockResolvedValue('refresh-token');
    prisma.$transaction.mockResolvedValue([] as never);

    const result = await service.login(
      { email: 'user@example.com', password: 'password123' },
      '127.0.0.1',
      'jest-agent',
    );

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      rememberMe: false,
      user: expect.objectContaining({
        id: 'u1',
        email: 'user@example.com',
        role: 'MASTER',
      }),
    });

    expect(lockout.clearLockout).toHaveBeenCalledWith(
      'user@example.com',
      '127.0.0.1',
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(cache.del).toHaveBeenCalledWith('user:u1:profile');
    expect(cache.del).toHaveBeenCalledWith('user:u1:master-profile');
  });
});
