import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppErrorMessages } from '../../../src/common/errors';
import { TokenService } from '../../../src/modules/auth/auth/services/token.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';

type PrismaTokenMock = {
  refreshToken: {
    create: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
};

describe('TokenService', () => {
  const prisma: PrismaTokenMock = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const jwtService = { sign: jest.fn() };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'jwt.accessSecret') return 'access-secret';
      if (key === 'jwt.accessExpiry') return '15m';
      return undefined;
    }),
  };

  let service: TokenService;

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService.sign.mockReturnValue('signed-access');
    service = new TokenService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  describe('generateAccessToken', () => {
    it('signs jwt with user payload and config', () => {
      const token = service.generateAccessToken({
        id: 'u1',
        email: 'a@b.com',
        role: 'CLIENT',
        isVerified: true,
      });
      expect(token).toBe('signed-access');
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'u1',
          email: 'a@b.com',
          role: 'CLIENT',
          isVerified: true,
        },
        { secret: 'access-secret', expiresIn: '15m' },
      );
    });

    it('uses 1h expiry when accessExpiry is not configured', () => {
      const cfg = {
        get: jest.fn((key: string) =>
          key === 'jwt.accessSecret' ? 'secret-only' : undefined,
        ),
      };
      const s = new TokenService(
        prisma as unknown as PrismaService,
        jwtService as unknown as JwtService,
        cfg as unknown as ConfigService,
      );
      s.generateAccessToken({
        id: 'u1',
        email: 'a@b.com',
        role: 'CLIENT',
        isVerified: false,
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ secret: 'secret-only', expiresIn: '1h' }),
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('persists token with rememberMe false (1 day)', async () => {
      prisma.refreshToken.create.mockResolvedValue({});
      const token = await service.generateRefreshToken('u1', false);
      expect(token).toMatch(/^[a-f0-9]{80}$/);
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      const arg = prisma.refreshToken.create.mock.calls[0][0];
      expect(arg.data.userId).toBe('u1');
      expect(arg.data.rememberMe).toBe(false);
      const exp: Date = arg.data.expiresAt;
      const diffDays = (exp.getTime() - Date.now()) / 86_400_000;
      expect(diffDays).toBeGreaterThan(0.99);
      expect(diffDays).toBeLessThan(1.01);
    });

    it('persists token with rememberMe true (30 days)', async () => {
      prisma.refreshToken.create.mockResolvedValue({});
      await service.generateRefreshToken('u1', true);
      const arg = prisma.refreshToken.create.mock.calls[0][0];
      expect(arg.data.rememberMe).toBe(true);
      const exp: Date = arg.data.expiresAt;
      const diffDays = (exp.getTime() - Date.now()) / 86_400_000;
      expect(diffDays).toBeGreaterThan(29.9);
      expect(diffDays).toBeLessThan(30.1);
    });
  });

  describe('refreshTokens', () => {
    const user = {
      id: 'u1',
      email: 'a@b.com',
      role: 'CLIENT' as const,
      isVerified: true,
      isBanned: false,
    };

    it('returns rotated tokens when refresh is valid', async () => {
      const future = new Date(Date.now() + 86_400_000);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        token: 'old-hex',
        expiresAt: future,
        rememberMe: true,
        user,
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens('old-hex');

      expect(result).toEqual({
        accessToken: 'signed-access',
        refreshToken: expect.stringMatching(/^[a-f0-9]{80}$/),
        rememberMe: true,
      });
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'rt1' },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('throws when refresh token record is missing', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refreshTokens('missing')).rejects.toEqual(
        expect.objectContaining({
          response: expect.objectContaining({
            message: AppErrorMessages.AUTH_INVALID_REFRESH_TOKEN,
          }),
        }),
      );
    });

    it('deletes and throws when refresh token is expired', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        token: 't',
        expiresAt: new Date(Date.now() - 1000),
        rememberMe: false,
        user,
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      await expect(service.refreshTokens('t')).rejects.toEqual(
        expect.objectContaining({
          response: expect.objectContaining({
            message: AppErrorMessages.AUTH_REFRESH_TOKEN_EXPIRED,
          }),
        }),
      );
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'rt1' },
      });
    });

    it('deletes and throws when user is banned', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        token: 't',
        expiresAt: new Date(Date.now() + 86_400_000),
        rememberMe: false,
        user: { ...user, isBanned: true },
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      await expect(service.refreshTokens('t')).rejects.toEqual(
        expect.objectContaining({
          response: expect.objectContaining({
            message: AppErrorMessages.AUTH_USER_NOT_FOUND_OR_BANNED,
          }),
        }),
      );
    });

    it('deletes and throws when user relation is missing', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        token: 't',
        expiresAt: new Date(Date.now() + 86_400_000),
        rememberMe: false,
        user: null,
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      await expect(service.refreshTokens('t')).rejects.toEqual(
        expect.objectContaining({
          response: expect.objectContaining({
            message: AppErrorMessages.AUTH_USER_NOT_FOUND_OR_BANNED,
          }),
        }),
      );
    });

    it('rethrows UnauthorizedException as-is', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refreshTokens('x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('deleteMany for tokens past expiresAt', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });
      await service.cleanupExpiredTokens();
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });
  });
});
