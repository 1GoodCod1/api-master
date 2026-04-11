import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { AppErrorMessages } from '../../../src/common/errors';
import { PasswordResetService } from '../../../src/modules/auth/auth/services/password-reset.service';
import type { PrismaService } from '../../../src/modules/shared/database/prisma.service';
import type { ConfigService } from '@nestjs/config';
import type { EmailService } from '../../../src/modules/email/email.service';
import type { AuditService } from '../../../src/modules/audit/audit.service';
import { AuditAction } from '../../../src/modules/audit/audit-action.enum';
import { AuditEntityType } from '../../../src/modules/audit/audit-entity-type.enum';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('new-hash'),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const argon2 = require('argon2') as { hash: jest.Mock };

describe('PasswordResetService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    passwordResetToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };

  const emailService = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  const auditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  let service: PasswordResetService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string, def?: string) => {
      if (key === 'frontendUrl') return 'https://app.example';
      if (key === 'nodeEnv') return 'test';
      return def;
    });
    service = new PasswordResetService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
      emailService as unknown as EmailService,
      auditService as unknown as AuditService,
    );
  });

  describe('forgotPassword', () => {
    it('returns generic message when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const r = await service.forgotPassword({ email: 'missing@x.com' });
      expect(r.message).toContain('If an account');
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('throws when user is banned', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        isBanned: true,
        preferredLanguage: 'en',
      });
      await expect(
        service.forgotPassword({ email: 'a@b.com' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: AppErrorMessages.RESET_ACCOUNT_BANNED,
        }),
      });
    });

    it('creates token, sends email, audits on success', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        isBanned: false,
        preferredLanguage: 'en',
      });
      prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      prisma.passwordResetToken.create.mockResolvedValue({});

      const r = await service.forgotPassword({ email: 'a@b.com' });

      expect(r.message).toContain('If an account');
      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalled();
      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          token: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      });
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'a@b.com',
        expect.stringContaining('/reset-password?token='),
        expect.any(String),
      );
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 'u1',
        action: AuditAction.PASSWORD_RESET_REQUESTED,
        entityType: AuditEntityType.User,
        entityId: 'u1',
      });
    });

    it('throws when production and frontendUrl missing', async () => {
      const errLog = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      try {
        configService.get.mockImplementation((key: string, def?: string) => {
          if (key === 'frontendUrl') return '';
          if (key === 'nodeEnv') return 'production';
          return def;
        });
        prisma.user.findUnique.mockResolvedValue({
          id: 'u1',
          email: 'a@b.com',
          isBanned: false,
          preferredLanguage: 'en',
        });
        prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
        prisma.passwordResetToken.create.mockResolvedValue({});

        await expect(
          service.forgotPassword({ email: 'a@b.com' }),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            message: AppErrorMessages.RESET_UNAVAILABLE,
          }),
        });
      } finally {
        errLog.mockRestore();
      }
    });
  });

  describe('resetPassword', () => {
    it('throws NotFound when token unknown', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);
      await expect(
        service.resetPassword({ token: 'x', password: 'NewPass1!' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when token already used', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1',
        used: true,
        expiresAt: new Date(Date.now() + 3600000),
        userId: 'u1',
        user: { isBanned: false },
      });
      await expect(
        service.resetPassword({ token: 'x', password: 'NewPass1!' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deletes expired token and throws', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1',
        used: false,
        expiresAt: new Date(Date.now() - 1000),
        userId: 'u1',
        user: { isBanned: false },
      });
      prisma.passwordResetToken.delete.mockResolvedValue({});
      await expect(
        service.resetPassword({ token: 'x', password: 'NewPass1!' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: AppErrorMessages.RESET_TOKEN_EXPIRED,
        }),
      });
      expect(prisma.passwordResetToken.delete).toHaveBeenCalledWith({
        where: { id: 't1' },
      });
    });

    it('updates password and marks token used in transaction', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1',
        used: false,
        expiresAt: new Date(Date.now() + 3600000),
        userId: 'u1',
        user: { isBanned: false },
      });
      prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
        Promise.resolve(
          fn({
            user: { update: jest.fn().mockResolvedValue({}) },
            passwordResetToken: {
              update: jest.fn().mockResolvedValue({}),
            },
          }),
        ),
      );
      prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });

      const r = await service.resetPassword({
        token: 'tok',
        password: 'NewPass1!Aa',
      });

      expect(r.message).toBe('Password has been reset successfully');
      expect(argon2.hash).toHaveBeenCalledWith('NewPass1!Aa');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 'u1',
        action: AuditAction.PASSWORD_RESET_COMPLETED,
        entityType: AuditEntityType.User,
        entityId: 'u1',
      });
    });
  });
});
