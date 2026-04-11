import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { TokenService } from './token.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { AuthLockoutService } from './auth-lockout.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUDIT_EVENT } from '../../../audit/audit.events';
import { AuditAction } from '../../../audit/audit-action.enum';
import { AuditEntityType } from '../../../audit/audit-entity-type.enum';
import {
  AUTH_LOGIN_FAIL_REASON_ACCOUNT_BANNED,
  AUTH_LOGIN_FAIL_REASON_INVALID_PASSWORD,
} from '../auth-login.messages';

@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly cache: CacheService,
    private readonly lockout: AuthLockoutService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Основной метод входа в систему
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    try {
      const user = await this.authenticateCredentials(
        loginDto,
        ipAddress,
        userAgent,
      );
      await this.ensureAccountActive(user, ipAddress, userAgent);
      return await this.generateSession(
        user,
        loginDto.rememberMe,
        ipAddress,
        userAgent,
      );
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      this.logger.error('Login failed', err);
      throw err;
    }
  }

  /**
   * Проверяет lockout, загружает пользователя, проверяет IP и верифицирует пароль.
   * Бросает UnauthorizedException при любом несоответствии.
   */
  private async authenticateCredentials(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { email, password } = loginDto;

    await this.lockout.checkLocked(email, ipAddress);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { masterProfile: true },
    });

    if (ipAddress) {
      await this.checkIpBlacklist(ipAddress);
    }

    if (!user?.password || !(await argon2.verify(user.password, password))) {
      if (user) {
        await this.lockout.recordFailed(email, ipAddress);
        await this.logLoginAttempt(
          user.id,
          false,
          ipAddress,
          userAgent,
          AUTH_LOGIN_FAIL_REASON_INVALID_PASSWORD,
        );
        this.eventEmitter.emit(AUDIT_EVENT, {
          userId: user.id,
          action: AuditAction.LOGIN_FAILED,
          entityType: AuditEntityType.User,
          entityId: user.id,
          newData: {
            reason: AUTH_LOGIN_FAIL_REASON_INVALID_PASSWORD,
          } satisfies Prisma.InputJsonValue,
          ipAddress,
          userAgent,
        });
      } else if (ipAddress) {
        await this.lockout.recordFailed(undefined, ipAddress);
      }
      throw AppErrors.unauthorized(
        AppErrorMessages.AUTH_LOGIN_INVALID_CREDENTIALS,
      );
    }

    return user;
  }

  /**
   * Проверяет, что аккаунт не заблокирован, и сбрасывает lockout-счётчик.
   * Бросает UnauthorizedException если пользователь забанен.
   */
  private async ensureAccountActive(
    user: Awaited<ReturnType<typeof this.authenticateCredentials>>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (user.isBanned) {
      await this.logLoginAttempt(
        user.id,
        false,
        ipAddress,
        userAgent,
        AUTH_LOGIN_FAIL_REASON_ACCOUNT_BANNED,
      );
      this.eventEmitter.emit(AUDIT_EVENT, {
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        entityType: AuditEntityType.User,
        entityId: user.id,
        newData: {
          reason: AUTH_LOGIN_FAIL_REASON_ACCOUNT_BANNED,
        } satisfies Prisma.InputJsonValue,
        ipAddress,
        userAgent,
      });
      throw AppErrors.unauthorized(AppErrorMessages.AUTH_LOGIN_ACCOUNT_BANNED);
    }

    await this.lockout.clearLockout(user.email, ipAddress);
  }

  /**
   * Генерирует токены, обновляет метаданные входа, инвалидирует кеш, пишет аудит.
   */
  private async generateSession(
    user: Awaited<ReturnType<typeof this.authenticateCredentials>>,
    rememberMe: boolean | undefined,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      rememberMe,
    );

    await this.updateLoginMetadata(user.id, ipAddress, userAgent);
    await this.cache.invalidateUser(user.id);
    this.eventEmitter.emit(AUDIT_EVENT, {
      userId: user.id,
      action: AuditAction.LOGIN_SUCCESS,
      entityType: AuditEntityType.User,
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      rememberMe: !!rememberMe,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        phoneVerified: user.phoneVerified,
        masterProfile: user.masterProfile,
      },
    };
  }

  /**
   * Выход из системы (удаление refresh токена)
   */
  async logout(refreshToken: string, userId?: string) {
    try {
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });

      if (userId) {
        this.eventEmitter.emit(AUDIT_EVENT, {
          userId,
          action: AuditAction.USER_LOGOUT,
          entityType: AuditEntityType.User,
          entityId: userId,
        });
      }

      return { message: 'Logged out successfully' };
    } catch (err) {
      this.logger.error('Logout failed', err);
      throw err;
    }
  }

  /**
   * Выход из всех сессий пользователя (удаление всех refresh токенов)
   */
  async logoutAll(userId: string) {
    try {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
      await this.cache.invalidateUser(userId);

      this.eventEmitter.emit(AUDIT_EVENT, {
        userId,
        action: AuditAction.USER_LOGOUT_ALL,
        entityType: AuditEntityType.User,
        entityId: userId,
      });

      return { message: 'All sessions logged out successfully' };
    } catch (err) {
      this.logger.error('logoutAll failed', err);
      throw err;
    }
  }

  /**
   * Валидация пользователя для Passport Local Strategy
   */
  async validateUser(email: string, password: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (user?.password && (await argon2.verify(user.password, password))) {
        const { password: _pwd, ...result } = user;
        void _pwd;
        return result;
      }

      return null;
    } catch (err) {
      this.logger.error('validateUser failed', err);
      throw err;
    }
  }

  // ==================== Вспомогательные методы (Private) ====================

  private async checkIpBlacklist(ipAddress: string) {
    const blacklisted = await this.prisma.ipBlacklist.findFirst({
      where: {
        ipAddress,
        OR: [{ permanent: true }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (blacklisted) {
      throw AppErrors.forbidden(AppErrorMessages.AUTH_LOGIN_IP_ACCESS_DENIED);
    }
  }

  private async logLoginAttempt(
    userId: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    failReason?: string,
  ) {
    await this.prisma.loginHistory.create({
      data: {
        userId,
        ipAddress,
        userAgent,
        success,
        failReason,
      },
    });
  }

  private async updateLoginMetadata(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          ipAddress,
        },
      }),
      this.prisma.loginHistory.create({
        data: {
          userId,
          ipAddress,
          userAgent,
          success: true,
        },
      }),
    ]);
  }
}
