import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CacheService } from '../shared/cache/cache.service';
import { TokenService } from './services/token.service';
import { RegistrationService } from './services/registration.service';
import { PasswordResetService } from './services/password-reset.service';
import { LoginService } from './services/login.service';

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

  async register(registerDto: RegisterDto) {
    return this.registrationService.register(registerDto);
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
    const cacheKey = this.cache.keys.userProfile(userId);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            isVerified: true,
            phoneVerified: true,
            isBanned: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            avatarFile: {
              select: {
                id: true,
                path: true,
                filename: true,
              },
            },
            masterProfile: {
              select: {
                id: true,
                tariffType: true,
                tariffExpiresAt: true,
                avatarFile: {
                  select: {
                    id: true,
                    path: true,
                    filename: true,
                  },
                },
              },
            },
          },
        });

        if (!user) {
          throw new NotFoundException('User not found');
        }

        return {
          user,
        };
      },
      this.cache.ttl.userProfile,
    );
  }

  async invalidateUserCache(userId: string) {
    await this.cache.del(this.cache.keys.userProfile(userId));
    await this.cache.del(this.cache.keys.userMasterProfile(userId));
  }

  // ==================== СБРОС ПАРОЛЯ ====================

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    return this.passwordResetService.forgotPassword(forgotPasswordDto);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(resetPasswordDto);
  }
}
