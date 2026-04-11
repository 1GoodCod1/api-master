import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole, OAuthProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TokenService } from './token.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { TariffType } from '../../../../common/constants';
import type { GoogleOAuthUser } from '../strategies/google.strategy';
import { CompleteOAuthDto } from '../dto/complete-oauth.dto';
import { generateUniqueSlugWithDb } from '../../../shared/utils/slug';

type OAuthUser = GoogleOAuthUser;

interface PendingOAuthPayload {
  type: 'oauth_pending';
  provider: OAuthProvider;
  providerId: string;
  email: string | undefined;
  firstName: string | undefined;
  lastName: string | undefined;
  picture: string | undefined;
  role?: 'CLIENT' | 'MASTER';
}

export type OAuthCallbackResult =
  | { type: 'login'; accessToken: string; refreshToken: string; user: object }
  | { type: 'pending'; pendingToken: string };

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
  ) {}

  async handleOAuthCallback(
    oauthUser: OAuthUser,
  ): Promise<OAuthCallbackResult> {
    const provider = oauthUser.provider as OAuthProvider;
    const { providerId, email, firstName, lastName, picture, role } = oauthUser;

    // 1. Look up existing OAuth account
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isVerified: true,
            isBanned: true,
          },
        },
      },
    });

    if (existingOAuth) {
      if (existingOAuth.user.isBanned) {
        throw new UnauthorizedException('Account is banned');
      }
      await this.prisma.oAuthAccount.update({
        where: { id: existingOAuth.id },
        data: { accessToken: null },
      });
      return this.buildLoginResult(existingOAuth.user);
    }

    // 2. Look up existing user by email (account linking)
    if (email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        if (existingUser.isBanned) {
          throw new UnauthorizedException('Account is banned');
        }
        await this.prisma.oAuthAccount.create({
          data: {
            userId: existingUser.id,
            provider,
            providerId,
            accessToken: null,
          },
        });
        return this.buildLoginResult(existingUser);
      }
    }

    // 3. New user — issue a short-lived pending token
    const pendingToken = this.signPendingToken({
      type: 'oauth_pending',
      provider,
      providerId,
      email,
      firstName,
      lastName,
      picture,
      ...(role !== undefined ? { role } : {}),
    });

    return { type: 'pending', pendingToken };
  }

  async completeOAuthRegistration(dto: CompleteOAuthDto) {
    const pendingToken = dto.pendingToken?.trim();
    if (!pendingToken) {
      throw new BadRequestException('Missing pending OAuth token');
    }
    const payload = this.verifyPendingToken(pendingToken);
    const chosenRole = payload.role ?? dto.role;
    if (chosenRole !== 'CLIENT' && chosenRole !== 'MASTER') {
      throw new BadRequestException('Role is required');
    }
    const resolvedPayload: PendingOAuthPayload = {
      ...payload,
      role: chosenRole,
    };

    const phoneExists = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (phoneExists) {
      throw new ConflictException('Phone number already registered');
    }
    if (chosenRole === 'MASTER') {
      if (!dto.city || !dto.category) {
        throw new BadRequestException(
          'City and category are required for master registration',
        );
      }
    }

    // Verify provider account hasn't been registered in the meantime
    const oauthExists = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: payload.provider,
          providerId: payload.providerId,
        },
      },
    });
    if (oauthExists) {
      const user = await this.prisma.user.findUnique({
        where: { id: oauthExists.userId },
      });
      if (!user) throw new UnauthorizedException('Account not found');
      return this.buildLoginResult(user);
    }
    try {
      if (chosenRole === 'MASTER') {
        return await this.createMasterOAuthUser(resolvedPayload, dto);
      }
      return await this.createClientOAuthUser(resolvedPayload, dto);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const linked = await this.prisma.oAuthAccount.findUnique({
          where: {
            provider_providerId: {
              provider: payload.provider,
              providerId: payload.providerId,
            },
          },
          include: {
            user: {
              select: { id: true, email: true, role: true, isVerified: true },
            },
          },
        });
        if (linked) return this.buildLoginResult(linked.user);
      }
      throw e;
    }
  }

  // ==================== Private helpers ====================

  private async createClientOAuthUser(
    payload: PendingOAuthPayload,
    dto: CompleteOAuthDto,
  ) {
    const user = await this.prisma.user.create({
      data: {
        email:
          payload.email ??
          `oauth_${payload.provider}_${payload.providerId}@noemail.local`,
        phone: dto.phone,
        password: null,
        role: UserRole.CLIENT,
        isVerified: false,
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
        oauthAccounts: {
          create: {
            provider: payload.provider,
            providerId: payload.providerId,
          },
        },
      },
    });

    return this.buildLoginResult(user);
  }

  private async createMasterOAuthUser(
    payload: PendingOAuthPayload,
    dto: CompleteOAuthDto,
  ) {
    const [city, category] = await Promise.all([
      this.prisma.city.findFirst({
        where: { isActive: true, OR: [{ slug: dto.city }, { name: dto.city }] },
      }),
      this.prisma.category.findFirst({
        where: {
          isActive: true,
          OR: [{ slug: dto.category }, { name: dto.category }],
        },
      }),
    ]);

    if (!city) throw new BadRequestException(`City "${dto.city}" not found`);
    if (!category)
      throw new BadRequestException(`Category "${dto.category}" not found`);

    const fullName =
      [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim() ||
      'master';

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email:
            payload.email ??
            `oauth_${payload.provider}_${payload.providerId}@noemail.local`,
          phone: dto.phone,
          password: null,
          role: UserRole.MASTER,
          isVerified: false,
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
          oauthAccounts: {
            create: {
              provider: payload.provider,
              providerId: payload.providerId,
            },
          },
        },
      });

      const slug = await generateUniqueSlugWithDb(fullName, async (prefix) => {
        const rows = await tx.master.findMany({
          where: { slug: { startsWith: prefix } },
          select: { slug: true },
        });
        return rows.map((m) => m.slug).filter((s): s is string => s != null);
      });

      const master = await tx.master.create({
        data: {
          userId: user.id,
          slug,
          cityId: city.id,
          categoryId: category.id,
          description: dto.description ?? null,
          rating: 0,
          totalReviews: 0,
          experienceYears: 0,
          tariffType: TariffType.BASIC,
          views: 0,
          leadsCount: 0,
        },
      });

      return { user, master };
    });

    await Promise.all([
      this.cache.invalidate(this.cache.patterns.mastersNew()),
      this.cache.invalidate(this.cache.patterns.categoriesAll()),
      this.cache.del(this.cache.keys.searchFilters()),
    ]).catch(() => {});

    return this.buildLoginResult(result.user);
  }

  private async buildLoginResult(user: {
    id: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
  }) {
    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      true,
    );
    return {
      type: 'login' as const,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  }

  private signPendingToken(payload: PendingOAuthPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.oauthPendingSecret'),
      expiresIn: '15m',
    });
  }

  private verifyPendingToken(token: string): PendingOAuthPayload {
    try {
      const payload = this.jwtService.verify<PendingOAuthPayload>(token, {
        secret: this.configService.get<string>('jwt.oauthPendingSecret'),
      });
      if (payload.type !== 'oauth_pending') {
        throw new Error('Wrong token type');
      }
      return payload;
    } catch {
      throw new UnauthorizedException(
        'Pending OAuth token is invalid or expired',
      );
    }
  }
}
