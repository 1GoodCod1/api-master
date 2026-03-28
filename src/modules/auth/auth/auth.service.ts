import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import { PrismaService } from '../../shared/database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CacheService } from '../../shared/cache/cache.service';
import { TokenService } from './services/token.service';
import { RegistrationService } from './services/registration.service';
import { PasswordResetService } from './services/password-reset.service';
import { LoginService } from './services/login.service';
import { USER_PROFILE_SELECT } from './constants/profile-select.constant';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly tokenService: TokenService,
    private readonly registrationService: RegistrationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly loginService: LoginService,
  ) {}

  // ==================== РЕГИСТРАЦИЯ ====================

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.registrationService.register(registerDto, ipAddress, userAgent);
  }

  async getRegistrationOptions() {
    return this.registrationService.getRegistrationOptions();
  }

  getEarlyBirdStatus() {
    // Баннер «первые 100» отключён — тарифы бесплатны после верификации
    return {
      isActive: false,
      remainingSlots: 0,
      totalSlots: 0,
    };
  }

  // ==================== АУТЕНТИФИКАЦИЯ ====================

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    return this.loginService.login(loginDto, ipAddress, userAgent);
  }

  async logout(refreshToken: string) {
    return this.loginService.logout(refreshToken);
  }

  async logoutAll(userId: string) {
    return this.loginService.logoutAll(userId);
  }

  async validateUser(email: string, password: string) {
    return this.loginService.validateUser(email, password);
  }

  // ==================== ТОКЕНЫ ====================

  async refreshTokens(refreshToken: string) {
    return this.tokenService.refreshTokens(refreshToken);
  }

  async cleanupExpiredTokens() {
    return this.tokenService.cleanupExpiredTokens();
  }

  // ==================== ПРОФИЛЬ ====================

  async getProfile(userId: string) {
    try {
      return this.cache.getOrSet(
        this.cache.keys.userProfile(userId),
        () => this.fetchUserProfile(userId),
        this.cache.ttl.userProfile,
      );
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error('getProfile failed', err);
      throw err;
    }
  }

  private async fetchUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PROFILE_SELECT,
    });

    if (!user) {
      throw AppErrors.notFound(AppErrorMessages.USER_NOT_FOUND);
    }

    return { user };
  }

  async invalidateUserCache(userId: string) {
    try {
      await this.cache.del(this.cache.keys.userProfile(userId));
      await this.cache.del(this.cache.keys.userMasterProfile(userId));
    } catch (err) {
      this.logger.error('invalidateUserCache failed', err);
      throw err;
    }
  }

  // ==================== СБРОС ПАРОЛЯ ====================

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    return this.passwordResetService.forgotPassword(forgotPasswordDto);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(resetPasswordDto);
  }
}
