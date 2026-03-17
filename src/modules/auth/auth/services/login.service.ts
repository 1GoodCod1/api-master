import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../shared/database/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { TokenService } from './token.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { AuthLockoutService } from './auth-lockout.service';

@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly cache: CacheService,
    private readonly lockout: AuthLockoutService,
  ) {}

  /**
   * Основной метод входа в систему
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    try {
      const { email, password } = loginDto;

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
      if (!user || !(await bcrypt.compare(password, user.password))) {
        if (user) {
          await this.lockout.recordFailed(email, ipAddress);
          await this.logLoginAttempt(
            user.id,
            false,
            ipAddress,
            userAgent,
            'Invalid password',
          );
        } else if (ipAddress) {
          await this.lockout.recordFailed(undefined, ipAddress);
        }
        throw new UnauthorizedException('Invalid credentials');
      }

      // 4. Проверка на блокировку аккаунта
      if (user.isBanned) {
        await this.logLoginAttempt(
          user.id,
          false,
          ipAddress,
          userAgent,
          'Account banned',
        );
        throw new UnauthorizedException('Account is banned');
      }

      // 4a. Сброс блокировки при успешном входе
      await this.lockout.clearLockout(email, ipAddress);

      // 5. Генерация токенов
      const accessToken = this.tokenService.generateAccessToken(user);
      const refreshToken = await this.tokenService.generateRefreshToken(
        user.id,
      );

      // 6. Обновление данных последнего входа и сохранение истории (в транзакции)
      await this.updateLoginMetadata(user.id, ipAddress, userAgent);

      // 7. Очистка кеша профиля пользователя
      await this.invalidateUserCache(user.id);

      // 8. Сборка ответа
      return {
        accessToken,
        refreshToken,
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
  async logout(refreshToken: string) {
    try {
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
      return { message: 'Logged out successfully' };
    } catch (err) {
      this.logger.error('Ошибка выхода', err);
      throw err;
    }
  }

  /**
   * Валидация пользователя для Passport Local Strategy
   */
  async validateUser(email: string, password: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (user && (await bcrypt.compare(password, user.password))) {
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
      throw new ForbiddenException('Access denied from this IP address');
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
