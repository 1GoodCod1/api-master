import { NotFoundException } from '@nestjs/common';
import { AppErrorMessages } from '../../../src/common/errors';
import { AuthService } from '../../../src/modules/auth/auth/auth.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { CacheService } from '../../../src/modules/shared/cache/cache.service';
import type { TokenService } from '../../../src/modules/auth/auth/services/token.service';
import type { RegistrationService } from '../../../src/modules/auth/auth/services/registration.service';
import type { PasswordResetService } from '../../../src/modules/auth/auth/services/password-reset.service';
import type { LoginService } from '../../../src/modules/auth/auth/services/login.service';

describe('AuthService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
  };

  const cache = {
    getOrSet: jest.fn(),
    keys: { userProfile: jest.fn((id: string) => `user:${id}:profile`) },
    ttl: { userProfile: 60 },
    invalidateUser: jest.fn(),
  };

  const tokenService = {
    refreshTokens: jest.fn(),
    cleanupExpiredTokens: jest.fn(),
  };

  const registrationService = {
    register: jest.fn(),
    getRegistrationOptions: jest.fn(),
  };

  const passwordResetService = {
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  const loginService = {
    login: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
    validateUser: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
      tokenService as unknown as jest.Mocked<TokenService>,
      registrationService as unknown as jest.Mocked<RegistrationService>,
      passwordResetService as unknown as jest.Mocked<PasswordResetService>,
      loginService as unknown as jest.Mocked<LoginService>,
    );
  });

  it('getEarlyBirdStatus returns static payload', () => {
    expect(service.getEarlyBirdStatus()).toEqual({
      isActive: false,
      remainingSlots: 0,
      totalSlots: 0,
    });
  });

  it('register delegates to RegistrationService', async () => {
    registrationService.register.mockResolvedValue({ ok: true });
    const dto = { email: 'a@b.com', password: 'x', role: 'CLIENT' } as never;
    const r = await service.register(dto, '1.1.1.1', 'ua');
    expect(r).toEqual({ ok: true });
    expect(registrationService.register).toHaveBeenCalledWith(
      dto,
      '1.1.1.1',
      'ua',
    );
  });

  it('login delegates to LoginService', async () => {
    loginService.login.mockResolvedValue({ access: 'a' });
    const dto = { email: 'a@b.com', password: 'p' } as never;
    expect(await service.login(dto)).toEqual({ access: 'a' });
    expect(loginService.login).toHaveBeenCalledWith(dto, undefined, undefined);
  });

  it('refreshTokens delegates to TokenService', async () => {
    tokenService.refreshTokens.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      rememberMe: false,
    });
    expect(await service.refreshTokens('rt')).toEqual({
      accessToken: 'a',
      refreshToken: 'r',
      rememberMe: false,
    });
    expect(tokenService.refreshTokens).toHaveBeenCalledWith('rt');
  });

  it('getProfile uses cache getOrSet with loader', async () => {
    const userRow = { id: 'u1', email: 'a@b.com' };
    prisma.user.findUnique.mockResolvedValue(userRow);
    cache.getOrSet.mockImplementation(
      async (_key: string, loader: () => Promise<unknown>) => loader(),
    );

    const result = await service.getProfile('u1');

    expect(cache.getOrSet).toHaveBeenCalledWith(
      'user:u1:profile',
      expect.any(Function),
      60,
    );
    expect(result).toEqual({ user: userRow });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: expect.any(Object),
    });
  });

  it('getProfile propagates NotFoundException from loader', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    cache.getOrSet.mockImplementation(
      async (_key: string, loader: () => Promise<unknown>) => loader(),
    );

    await expect(service.getProfile('missing')).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({
          message: AppErrorMessages.USER_NOT_FOUND,
        }),
      }),
    );
  });

  it('getProfile wraps unexpected errors', async () => {
    cache.getOrSet.mockRejectedValue(new Error('cache down'));
    await expect(service.getProfile('u1')).rejects.toThrow('cache down');
  });

  it('getProfile rethrows NotFoundException from cache layer', async () => {
    cache.getOrSet.mockRejectedValue(new NotFoundException());
    await expect(service.getProfile('u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
