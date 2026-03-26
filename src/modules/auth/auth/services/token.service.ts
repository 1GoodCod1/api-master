import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { User } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(
    user: Pick<User, 'id' | 'email' | 'role' | 'isVerified'>,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.accessSecret'),
      expiresIn: this.configService.get('jwt.accessExpiry') || '1h',
    });
  }

  private static readonly REMEMBER_ME_DAYS = 30;
  private static readonly SESSION_DAYS = 1;

  async generateRefreshToken(
    userId: string,
    rememberMe?: boolean,
  ): Promise<string> {
    try {
      const token = randomBytes(40).toString('hex');
      const days = rememberMe
        ? TokenService.REMEMBER_ME_DAYS
        : TokenService.SESSION_DAYS;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      await this.prisma.refreshToken.create({
        data: {
          token,
          userId,
          expiresAt,
          rememberMe: !!rememberMe,
        },
      });

      return token;
    } catch (err) {
      this.logger.error('generateRefreshToken failed', err);
      throw err;
    }
  }

  async refreshTokens(refreshToken: string) {
    try {
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
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

      if (!tokenRecord) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (tokenRecord.expiresAt < new Date()) {
        await this.prisma.refreshToken.delete({
          where: { id: tokenRecord.id },
        });
        throw new UnauthorizedException('Refresh token expired');
      }

      if (!tokenRecord.user || tokenRecord.user.isBanned) {
        await this.prisma.refreshToken.delete({
          where: { id: tokenRecord.id },
        });
        throw new UnauthorizedException('User not found or banned');
      }

      const newAccessToken = this.generateAccessToken(tokenRecord.user);
      const wasRememberMe = tokenRecord.rememberMe;
      await this.prisma.refreshToken.delete({
        where: { id: tokenRecord.id },
      });
      const newRefreshToken = await this.generateRefreshToken(
        tokenRecord.user.id,
        wasRememberMe,
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        rememberMe: wasRememberMe,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error('refreshTokens failed', err);
      throw err;
    }
  }

  async cleanupExpiredTokens() {
    try {
      await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
    } catch (err) {
      this.logger.error('cleanupExpiredTokens failed', err);
      throw err;
    }
  }
}
