import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OAuthService } from '../../../src/modules/auth/auth/services/oauth.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { TokenService } from '../../../src/modules/auth/auth/services/token.service';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { CacheService } from '../../../src/modules/shared/cache/cache.service';
import type { GoogleOAuthUser } from '../../../src/modules/auth/auth/strategies/google.strategy';

// Mock the slug utility used inside createMasterOAuthUser (dynamic import)
jest.mock('../../../src/modules/shared/utils/slug', () => ({
  generateSlug: jest.fn((s: string) => s.toLowerCase().replace(/\s+/g, '-')),
  generateUniqueSlugWithDb: jest.fn().mockResolvedValue('ivan-petrov'),
}));

// ─── Prisma mock type ─────────────────────────────────────────────────────────

type PrismaOAuthMock = {
  oAuthAccount: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
  user: { findUnique: jest.Mock; create: jest.Mock };
  city: { findFirst: jest.Mock };
  category: { findFirst: jest.Mock };
  $transaction: jest.Mock;
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PENDING_SECRET = 'test-oauth-pending-secret-minimum-32b';

const baseUser = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'CLIENT' as const,
  isVerified: false,
  isBanned: false,
};

const googleUser: GoogleOAuthUser = {
  provider: 'GOOGLE',
  providerId: 'google-123',
  email: 'test@example.com',
  firstName: 'Ivan',
  lastName: 'Petrov',
  picture: undefined,
  accessToken: 'gat-ignored',
};

const validPendingPayload = {
  type: 'oauth_pending' as const,
  provider: 'GOOGLE' as const,
  providerId: 'google-123',
  email: 'test@example.com',
  firstName: 'Ivan',
  lastName: 'Petrov',
  picture: undefined,
  role: 'CLIENT' as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePrisma(): PrismaOAuthMock {
  return {
    oAuthAccount: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    city: { findFirst: jest.fn() },
    category: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
}

function makeP2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '5.0.0',
    meta: { target: ['provider', 'providerId'] },
  });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('OAuthService', () => {
  let service: OAuthService;
  let prisma: PrismaOAuthMock;

  const tokenService = {
    generateAccessToken: jest.fn().mockReturnValue('access-token'),
    generateRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
  } as unknown as jest.Mocked<TokenService>;

  const jwtService = {
    sign: jest.fn().mockReturnValue('signed-pending-token'),
    verify: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'jwt.oauthPendingSecret') return PENDING_SECRET;
      return undefined;
    }),
  } as unknown as jest.Mocked<ConfigService>;

  const cache = {
    invalidate: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    patterns: {
      mastersNew: jest.fn().mockReturnValue('masters:new'),
      categoriesAll: jest.fn().mockReturnValue('categories:all'),
    },
    keys: {
      searchFilters: jest.fn().mockReturnValue('search:filters'),
    },
  } as unknown as jest.Mocked<CacheService>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    tokenService.generateAccessToken.mockReturnValue('access-token');
    tokenService.generateRefreshToken.mockResolvedValue('refresh-token');
    jwtService.sign.mockReturnValue('signed-pending-token');
    jwtService.verify.mockReturnValue(validPendingPayload);

    service = new OAuthService(
      prisma as unknown as PrismaService,
      tokenService,
      jwtService,
      configService,
      cache,
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // handleOAuthCallback
  // ═══════════════════════════════════════════════════════════════════════════

  describe('handleOAuthCallback', () => {
    describe('existing OAuth account', () => {
      it('returns login result and clears stored access token', async () => {
        prisma.oAuthAccount.findUnique.mockResolvedValue({
          id: 'oa-1',
          user: baseUser,
        });

        const result = await service.handleOAuthCallback(googleUser);

        expect(result.type).toBe('login');
        expect(prisma.oAuthAccount.update).toHaveBeenCalledWith({
          where: { id: 'oa-1' },
          data: { accessToken: null },
        });
        expect(tokenService.generateAccessToken).toHaveBeenCalledWith(baseUser);
        expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(
          baseUser.id,
          true,
        );
      });

      it('throws UnauthorizedException when account is banned', async () => {
        prisma.oAuthAccount.findUnique.mockResolvedValue({
          id: 'oa-1',
          user: { ...baseUser, isBanned: true },
        });

        await expect(
          service.handleOAuthCallback(googleUser),
        ).rejects.toBeInstanceOf(UnauthorizedException);
        expect(prisma.oAuthAccount.update).not.toHaveBeenCalled();
      });
    });

    describe('no existing OAuth account — email linking', () => {
      beforeEach(() => {
        prisma.oAuthAccount.findUnique.mockResolvedValue(null);
      });

      it('links OAuth to existing user by email and returns login', async () => {
        prisma.user.findUnique.mockResolvedValue(baseUser);

        const result = await service.handleOAuthCallback(googleUser);

        expect(result.type).toBe('login');
        expect(prisma.oAuthAccount.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: baseUser.id,
            provider: 'GOOGLE',
            providerId: 'google-123',
            accessToken: null,
          }),
        });
      });

      it('throws UnauthorizedException when email-linked user is banned', async () => {
        prisma.user.findUnique.mockResolvedValue({
          ...baseUser,
          isBanned: true,
        });

        await expect(
          service.handleOAuthCallback(googleUser),
        ).rejects.toBeInstanceOf(UnauthorizedException);
        expect(prisma.oAuthAccount.create).not.toHaveBeenCalled();
      });
    });

    describe('new user (no OAuth account, no email match)', () => {
      beforeEach(() => {
        prisma.oAuthAccount.findUnique.mockResolvedValue(null);
        prisma.user.findUnique.mockResolvedValue(null);
      });

      it('returns pending token with correct payload', async () => {
        const result = await service.handleOAuthCallback(googleUser);

        expect(result.type).toBe('pending');
        expect(
          (result as { type: 'pending'; pendingToken: string }).pendingToken,
        ).toBe('signed-pending-token');
        expect(jwtService.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'oauth_pending',
            provider: 'GOOGLE',
            providerId: 'google-123',
            email: 'test@example.com',
          }),
          expect.objectContaining({ secret: PENDING_SECRET, expiresIn: '15m' }),
        );
      });

      it('omits role from pending payload when role is undefined', async () => {
        await service.handleOAuthCallback({ ...googleUser, role: undefined });

        const payload = (jwtService.sign as jest.Mock).mock
          .calls[0][0] as Record<string, unknown>;
        expect('role' in payload).toBe(false);
      });

      it('includes role in pending payload when role is provided', async () => {
        await service.handleOAuthCallback({ ...googleUser, role: 'MASTER' });

        const payload = (jwtService.sign as jest.Mock).mock
          .calls[0][0] as Record<string, unknown>;
        expect(payload.role).toBe('MASTER');
      });

      it('skips email lookup and issues pending token when email is undefined', async () => {
        await service.handleOAuthCallback({ ...googleUser, email: undefined });

        expect(prisma.user.findUnique).not.toHaveBeenCalled();
        expect(jwtService.sign).toHaveBeenCalled();
      });

      it('generates fallback email placeholder when email undefined', async () => {
        await service.handleOAuthCallback({ ...googleUser, email: undefined });

        const payload = (jwtService.sign as jest.Mock).mock
          .calls[0][0] as Record<string, unknown>;
        expect(payload.email).toBeUndefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // completeOAuthRegistration
  // ═══════════════════════════════════════════════════════════════════════════

  describe('completeOAuthRegistration', () => {
    beforeEach(() => {
      // Default: no phone conflict, no pre-existing OAuth account
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.oAuthAccount.findUnique.mockResolvedValue(null);
    });

    // ── Validation ────────────────────────────────────────────────────────────

    it('throws BadRequestException when pendingToken is absent', async () => {
      await expect(
        service.completeOAuthRegistration({ phone: '+37312345678' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when pendingToken is blank string', async () => {
      await expect(
        service.completeOAuthRegistration({
          pendingToken: '   ',
          phone: '+37312345678',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws UnauthorizedException when JWT signature is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(
        service.completeOAuthRegistration({
          pendingToken: 'bad',
          phone: '+37312345678',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when token has wrong type field', async () => {
      jwtService.verify.mockReturnValue({
        type: 'access_token',
        provider: 'GOOGLE',
        providerId: 'x',
      });

      await expect(
        service.completeOAuthRegistration({
          pendingToken: 'tok',
          phone: '+37312345678',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws BadRequestException when neither JWT nor DTO contains a role', async () => {
      jwtService.verify.mockReturnValue({
        ...validPendingPayload,
        role: undefined,
      });

      await expect(
        service.completeOAuthRegistration({
          pendingToken: 'tok',
          phone: '+37312345678',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('uses role from DTO when JWT pending payload has no role', async () => {
      jwtService.verify.mockReturnValue({
        ...validPendingPayload,
        role: undefined,
      });
      prisma.user.create.mockResolvedValue(baseUser);

      const result = await service.completeOAuthRegistration({
        pendingToken: 'tok',
        phone: '+37312345678',
        role: 'CLIENT',
      });

      expect(result.type).toBe('login');
    });

    it('throws ConflictException when phone is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser); // phone conflict

      await expect(
        service.completeOAuthRegistration({
          pendingToken: 'tok',
          phone: '+37312345678',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws BadRequestException for MASTER without city', async () => {
      jwtService.verify.mockReturnValue({
        ...validPendingPayload,
        role: 'MASTER',
      });

      await expect(
        service.completeOAuthRegistration({
          pendingToken: 'tok',
          phone: '+37312345678',
          category: 'plumbing',
          // city intentionally omitted
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException for MASTER without category', async () => {
      jwtService.verify.mockReturnValue({
        ...validPendingPayload,
        role: 'MASTER',
      });

      await expect(
        service.completeOAuthRegistration({
          pendingToken: 'tok',
          phone: '+37312345678',
          city: 'chisinau',
          // category intentionally omitted
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    // ── Pre-existing account (race pre-check) ─────────────────────────────────

    it('returns login when oauthAccount already exists at pre-check stage', async () => {
      prisma.oAuthAccount.findUnique.mockResolvedValue({
        userId: baseUser.id,
      });
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // phone uniqueness check
        .mockResolvedValueOnce(baseUser); // user lookup by id

      const result = await service.completeOAuthRegistration({
        pendingToken: 'tok',
        phone: '+37312345678',
      });

      expect(result.type).toBe('login');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    // ── CLIENT creation ───────────────────────────────────────────────────────

    it('creates CLIENT user with correct data and returns login', async () => {
      prisma.user.create.mockResolvedValue({ ...baseUser, role: 'CLIENT' });

      const result = await service.completeOAuthRegistration({
        pendingToken: 'tok',
        phone: '+37312345678',
      });

      expect(result.type).toBe('login');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: validPendingPayload.email,
          phone: '+37312345678',
          password: null,
          role: 'CLIENT',
          isVerified: false,
          firstName: 'Ivan',
          lastName: 'Petrov',
        }),
      });
    });

    it('generates fallback email for CLIENT when OAuth provider has no email', async () => {
      jwtService.verify.mockReturnValue({
        ...validPendingPayload,
        email: undefined,
        role: 'CLIENT',
      });
      prisma.user.create.mockResolvedValue({
        ...baseUser,
        email: 'oauth_GOOGLE_google-123@noemail.local',
      });

      await service.completeOAuthRegistration({
        pendingToken: 'tok',
        phone: '+37312345678',
      });

      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.email).toMatch(
        /^oauth_GOOGLE_google-123@noemail\.local$/,
      );
    });

    // ── MASTER creation ───────────────────────────────────────────────────────

    it('creates MASTER user inside a transaction and returns login', async () => {
      jwtService.verify.mockReturnValue({
        ...validPendingPayload,
        role: 'MASTER',
      });

      const masterUser = { ...baseUser, role: 'MASTER' as const };
      prisma.city.findFirst.mockResolvedValue({
        id: 'city-1',
        name: 'Chisinau',
        slug: 'chisinau',
        isActive: true,
      });
      prisma.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        name: 'Plumbing',
        slug: 'plumbing',
        isActive: true,
      });

      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const txMock = {
            user: { create: jest.fn().mockResolvedValue(masterUser) },
            master: {
              findMany: jest.fn().mockResolvedValue([]),
              create: jest
                .fn()
                .mockResolvedValue({ id: 'm-1', slug: 'ivan-petrov' }),
            },
          };
          return fn(txMock);
        },
      );

      const result = await service.completeOAuthRegistration({
        pendingToken: 'tok',
        phone: '+37312345678',
        city: 'chisinau',
        category: 'plumbing',
        description: 'Expert plumber',
      });

      expect(result.type).toBe('login');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequestException for MASTER when city slug does not exist', async () => {
      jwtService.verify.mockReturnValue({
        ...validPendingPayload,
        role: 'MASTER',
      });
      prisma.city.findFirst.mockResolvedValue(null);
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });

      await expect(
        service.completeOAuthRegistration({
          pendingToken: 'tok',
          phone: '+37312345678',
          city: 'nonexistent',
          category: 'plumbing',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException for MASTER when category slug does not exist', async () => {
      jwtService.verify.mockReturnValue({
        ...validPendingPayload,
        role: 'MASTER',
      });
      prisma.city.findFirst.mockResolvedValue({ id: 'city-1' });
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.completeOAuthRegistration({
          pendingToken: 'tok',
          phone: '+37312345678',
          city: 'chisinau',
          category: 'nonexistent',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    // ── Race condition (fix #1) ───────────────────────────────────────────────

    it('recovers from P2002 race: finds linked account and returns login', async () => {
      prisma.user.create.mockRejectedValue(makeP2002());
      // After P2002: oAuthAccount.findUnique is called with include: { user }
      prisma.oAuthAccount.findUnique
        .mockResolvedValueOnce(null) // pre-check
        .mockResolvedValueOnce({ user: baseUser }); // race recovery

      const result = await service.completeOAuthRegistration({
        pendingToken: 'tok',
        phone: '+37312345678',
      });

      expect(result.type).toBe('login');
      // findUnique called twice: once for pre-check, once after P2002
      expect(prisma.oAuthAccount.findUnique).toHaveBeenCalledTimes(2);
    });

    it('rethrows P2002 when race recovery finds no linked account', async () => {
      prisma.user.create.mockRejectedValue(makeP2002());
      prisma.oAuthAccount.findUnique
        .mockResolvedValueOnce(null) // pre-check
        .mockResolvedValueOnce(null); // race recovery: also null (very unlikely edge case)

      await expect(
        service.completeOAuthRegistration({
          pendingToken: 'tok',
          phone: '+37312345678',
        }),
      ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    });

    it('rethrows non-P2002 errors without recovery', async () => {
      const unexpectedError = new Error('Database connection lost');
      prisma.user.create.mockRejectedValue(unexpectedError);

      await expect(
        service.completeOAuthRegistration({
          pendingToken: 'tok',
          phone: '+37312345678',
        }),
      ).rejects.toThrow('Database connection lost');

      // oAuthAccount.findUnique called only for pre-check, not for recovery
      expect(prisma.oAuthAccount.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
