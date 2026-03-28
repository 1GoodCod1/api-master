import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { TokenService } from './token.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { AuthLockoutService } from './auth-lockout.service';
import { AuditService } from '../../../audit/audit.service';
import { AuditAction } from '../../../audit/audit-action.enum';
import { AuditEntityType } from '../../../audit/audit-entity-type.enum';
import {
  AUTH_LOGIN_ACCOUNT_BANNED,
  AUTH_LOGIN_FAIL_REASON_ACCOUNT_BANNED,
  AUTH_LOGIN_FAIL_REASON_INVALID_PASSWORD,
  AUTH_LOGIN_INVALID_CREDENTIALS,
  AUTH_LOGIN_IP_ACCESS_DENIED,
} from '../auth-login.messages';

@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly cache: CacheService,
    private readonly lockout: AuthLockoutService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Основной метод входа в систему
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    try {
      const { email, password, rememberMe } = loginDto;

      // 0. Проверка блокировки (account lockout после 5 неудачных попыток)
      await this.lockout.checkLocked(email, ipAddress);

      // 1. Поиск пользователя
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          masterProfile: true,
        },
      });

      // 2. Проверка IP на наличие в черном списке
      if (ipAddress) {
        await this.checkIpBlacklist(ipAddress);
      }

      // 3. Валидация пароля и логирование неудачных попыток
      if (!user || !(await argon2.verify(user.password, password))) {
        if (user) {
          await this.lockout.recordFailed(email, ipAddress);
          await this.logLoginAttempt(
            user.id,
            false,
            ipAddress,
            userAgent,
            AUTH_LOGIN_FAIL_REASON_INVALID_PASSWORD,
          );
          await this.auditService.log({
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
        throw new UnauthorizedException(AUTH_LOGIN_INVALID_CREDENTIALS);
      }

      // 4. Проверка на блокировку аккаунта
      if (user.isBanned) {
        await this.logLoginAttempt(
          user.id,
          false,
          ipAddress,
          userAgent,
          AUTH_LOGIN_FAIL_REASON_ACCOUNT_BANNED,
        );
        await this.auditService.log({
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
        throw new UnauthorizedException(AUTH_LOGIN_ACCOUNT_BANNED);
      }

      // 4a. Сброс блокировки при успешном входе
      await this.lockout.clearLockout(email, ipAddress);

      // 5. Генерация токенов
      const accessToken = this.tokenService.generateAccessToken(user);
      const refreshToken = await this.tokenService.generateRefreshToken(
        user.id,
        rememberMe,
      );

      // 6. Обновление данных последнего входа и сохранение истории (в транзакции)
      await this.updateLoginMetadata(user.id, ipAddress, userAgent);

      // 7. Очистка кеша профиля пользователя
      await this.invalidateUserCache(user.id);

      // 7.5. Audit log — успешный вход
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.LOGIN_SUCCESS,
        entityType: AuditEntityType.User,
        entityId: user.id,
        ipAddress: ipAddress,
        userAgent: userAgent,
      });

      // 8. Сборка ответа
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
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      this.logger.error('Ошибка входа', err);
      throw err;
    }
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
        await this.auditService.log({
          userId,
          action: AuditAction.USER_LOGOUT,
          entityType: AuditEntityType.User,
          entityId: userId,
        });
      }

      return { message: 'Logged out successfully' };
    } catch (err) {
      this.logger.error('Ошибка выхода', err);
      throw err;
    }
  }

  /**
   * Выход из всех сессий пользователя (удаление всех refresh токенов)
   */
  async logoutAll(userId: string) {
    try {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
      await this.invalidateUserCache(userId);

      await this.auditService.log({
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

      if (user && (await argon2.verify(user.password, password))) {
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
      throw new ForbiddenException(AUTH_LOGIN_IP_ACCESS_DENIED);
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

  private async invalidateUserCache(userId: string) {
    await this.cache.del(this.cache.keys.userProfile(userId));
    await this.cache.del(this.cache.keys.userMasterProfile(userId));
  }
}
