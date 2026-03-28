import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';

interface CachedUserProfile {
  id: string;
  email: string;
  phone: string | null;
  firstName?: string | null;
  role: string;
  phoneVerified?: boolean;
  isVerified?: boolean;
  masterProfile: unknown;
  isBanned: boolean;
}

/**
 * Стратегия аутентификации на основе JWT токенов.
 * Использует CacheService для быстрой проверки статуса пользователя (бан, верификация)
 * без постоянных обращений к базе данных.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {
    const secret = configService.get<string>('jwt.accessSecret') ?? '';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- PassportStrategy/Strategy types from passport-jwt
    super({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- passport-jwt types incomplete
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Валидация токена и извлечение данных пользователя.
   * Сначала ищет пользователя в кэше, если не находит - запрашивает в БД и кэширует.
   */
  async validate(payload: { sub: string; [key: string]: unknown }) {
    const userId = payload.sub;
    const cacheKey = this.cache.keys.userMasterProfile(userId);

    // Проверка в кэше
    const cached = await this.cache.get<CachedUserProfile>(cacheKey);
    if (cached) {
      if (cached.isBanned) {
        throw new UnauthorizedException('Your account is blocked');
      }

      // Если в кэше неполные данные, сбрасываем его
      if (!('phoneVerified' in cached) || !('isVerified' in cached)) {
        await this.cache.del(cacheKey);
      } else {
        return {
          id: cached.id,
          email: cached.email,
          phone: cached.phone,
          firstName: cached.firstName,
          role: cached.role,
          phoneVerified: cached.phoneVerified === true,
          isVerified: cached.isVerified === true,
          masterProfile: cached.masterProfile,
        };
      }
    }

    // Если в кэше нет - идем в БД
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { masterProfile: true },
    });

    if (!user || user.isBanned) {
      throw new UnauthorizedException(
        user?.isBanned ? 'Your account is blocked' : 'User not found',
      );
    }

    const result = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      role: user.role,
      phoneVerified: user.phoneVerified ?? false,
      isVerified: user.isVerified ?? false,
      masterProfile: user.masterProfile,
      isBanned: user.isBanned,
    };

    // Сохраняем в кэш на 2 минуты — короткий TTL для быстрой propagation бана
    await this.cache.set(cacheKey, result, 120);

    return {
      id: result.id,
      email: result.email,
      phone: result.phone,
      firstName: result.firstName,
      role: result.role,
      phoneVerified: result.phoneVerified,
      isVerified: result.isVerified,
      masterProfile: result.masterProfile,
    };
  }
}
