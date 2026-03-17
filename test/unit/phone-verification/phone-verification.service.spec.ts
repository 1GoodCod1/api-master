import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PhoneVerificationActionService } from '../../../src/modules/phone-verification/services/phone-verification-action.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { EncryptionService } from '../../../src/modules/shared/utils/encryption.service';
import type { CacheService } from '../../../src/modules/shared/cache/cache.service';
import type { ConfigService } from '@nestjs/config';
import type { PhoneVerificationValidationService } from '../../../src/modules/phone-verification/services/phone-verification-validation.service';

type PrismaPhoneVerificationMock = {
  user: { findUnique: jest.Mock; update: jest.Mock };
  phoneVerification: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('PhoneVerificationActionService', () => {
  const prisma: PrismaPhoneVerificationMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    phoneVerification: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const encryption = {
    generateCode: jest.fn(),
    hash: jest.fn(),
  } as unknown as jest.Mocked<EncryptionService>;

  const configService = {
    get: jest.fn(),
  } as unknown as jest.Mocked<ConfigService>;

  const cache = {
    del: jest.fn(),
    keys: {
      userMasterProfile: jest.fn(
        (userId: string) => `cache:user:${userId}:master-profile`,
      ),
      userProfile: jest.fn((userId: string) => `cache:user:${userId}:profile`),
    },
  } as unknown as jest.Mocked<CacheService>;

  const validationService = {
    assertCanSendCode: jest.fn(),
    assertCanVerifyCode: jest.fn(),
  } as unknown as jest.Mocked<PhoneVerificationValidationService>;

  let service: PhoneVerificationActionService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      return undefined as never;
    });
    service = new PhoneVerificationActionService(
      prisma as unknown as PrismaService,
      encryption,
      cache,
      configService,
      validationService,
    );
  });

  it('throws NotFoundException when sending code for missing user', async () => {
    validationService.assertCanSendCode.mockRejectedValue(
      new NotFoundException('User not found'),
    );

    await expect(service.sendVerificationCode('u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws BadRequestException on wrong verification code and increments attempts', async () => {
    validationService.assertCanVerifyCode.mockResolvedValue({
      user: { id: 'u1', phoneVerified: false, role: 'CLIENT' } as never,
      verification: { id: 'pv1', code: 'hashed-correct', attempts: 0 } as never,
    });
    encryption.hash.mockReturnValue('hashed-wrong');
    prisma.phoneVerification.update.mockResolvedValue({} as never);

    await expect(service.verifyCode('u1', '000000')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(prisma.phoneVerification.update).toHaveBeenCalledWith({
      where: { id: 'pv1' },
      data: { attempts: { increment: 1 } },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('verifies code, updates user and invalidates cache', async () => {
    validationService.assertCanVerifyCode.mockResolvedValue({
      user: { id: 'u1', phoneVerified: false, role: 'CLIENT' } as never,
      verification: { id: 'pv1', code: 'hashed-123456', attempts: 0 } as never,
    });
    encryption.hash.mockReturnValue('hashed-123456');
    prisma.phoneVerification.update.mockResolvedValue({} as never);
    prisma.user.update.mockResolvedValue({} as never);
    prisma.$transaction.mockResolvedValue([] as never);

    const result = await service.verifyCode('u1', '123456');

    expect(result).toEqual({ message: 'Phone verified successfully' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({
        phoneVerified: true,
        isVerified: true,
      }),
    });
    expect(cache.del).toHaveBeenCalledWith('cache:user:u1:master-profile');
    expect(cache.del).toHaveBeenCalledWith('cache:user:u1:profile');
  });
});
