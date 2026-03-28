import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../shared/database/prisma.service';
import { EmailService } from '../../../email/email.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { parseAppLocale } from '../../../../common/constants';
import { AuditService } from '../../../audit/audit.service';
import { AuditAction } from '../../../audit/audit-action.enum';
import { AuditEntityType } from '../../../audit/audit-entity-type.enum';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const { email } = forgotPasswordDto;

      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      // Для безопасности всегда возвращаем успех, даже если пользователь не найден
      if (!user) {
        return {
          message:
            'If an account with that email exists, a password reset link has been sent.',
        };
      }

      if (user.isBanned) {
        throw new BadRequestException('Account is banned');
      }

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Токен действителен 1 час

      // Удаляем старые неиспользованные токены для этого пользователя
      await this.prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      // Создаем новый токен
      await this.prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      const frontendUrl = this.configService.get<string>('frontendUrl', '');
      const nodeEnv = this.configService.get<string>('nodeEnv', 'development');
      if (!frontendUrl && nodeEnv === 'production') {
        this.logger.error(
          'FRONTEND_URL is required in production for password reset links',
        );
        throw new BadRequestException(
          'Password reset is temporarily unavailable. Please try again later.',
        );
      }
      const resetLink = `${frontendUrl || 'http://localhost:3000'}/reset-password?token=${token}`;
      const lang = parseAppLocale(user.preferredLanguage);
      await this.emailService.sendPasswordResetEmail(
        user.email,
        resetLink,
        lang,
      );

      // Audit log — запрос сброса пароля
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.PASSWORD_RESET_REQUESTED,
        entityType: AuditEntityType.User,
        entityId: user.id,
      });

      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error('forgotPassword failed', err);
      throw err;
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const { token, password } = resetPasswordDto;

      // Находим токен
      const resetToken = await this.prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!resetToken) {
        throw new NotFoundException('Invalid or expired reset token');
      }

      if (resetToken.used) {
        throw new BadRequestException('This reset token has already been used');
      }

      if (resetToken.expiresAt < new Date()) {
        // Удаляем истекший токен
        await this.prisma.passwordResetToken.delete({
          where: { id: resetToken.id },
        });
        throw new BadRequestException(
          'Reset token has expired. Please request a new one.',
        );
      }

      if (!resetToken.user || resetToken.user.isBanned) {
        throw new BadRequestException('User not found or banned');
      }

      // Хешируем новый пароль
      const hashedPassword = await argon2.hash(password);

      // Обновляем пароль и помечаем токен как использованный
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: resetToken.userId },
          data: { password: hashedPassword },
        });

        await tx.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true },
        });
      });

      // Удаляем все неиспользованные токены для этого пользователя
      await this.prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
          used: false,
        },
      });

      // Audit log — успешный сброс пароля
      await this.auditService.log({
        userId: resetToken.userId,
        action: AuditAction.PASSWORD_RESET_COMPLETED,
        entityType: AuditEntityType.User,
        entityId: resetToken.userId,
      });

      return {
        message: 'Password has been reset successfully',
      };
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error('resetPassword failed', err);
      throw err;
    }
  }
}
