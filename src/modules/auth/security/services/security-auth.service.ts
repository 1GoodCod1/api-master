import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuditService } from '../../../audit/audit.service';

@Injectable()
export class SecurityAuthService {
  private readonly logger = new Logger(SecurityAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Логировать попытку входа
   * @param userId ID пользователя
   * @param ipAddress IP адрес
   * @param userAgent Данные браузера
   * @param success Успешность входа
   * @param failReason Причина отказа (при ошибке)
   */
  async logLogin(
    userId: string,
    ipAddress: string | undefined,
    userAgent: string | undefined,
    success: boolean,
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

    if (!success) {
      const failedAttempts = await this.prisma.loginHistory.count({
        where: {
          userId,
          success: false,
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        },
      });

      return { failedAttempts };
    }
    return { failedAttempts: 0 };
  }

  /**
   * Получить историю входов пользователя
   * @param userId ID пользователя
   * @param limit Лимит записей
   */
  async getLoginHistory(userId: string, limit: number = 10) {
    return this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Смена пароля
   * @param userId ID пользователя
   * @param currentPassword Текущий пароль
   * @param newPassword Новый пароль
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Пользователь не найден');
    if (!user.password)
      throw new BadRequestException('Пароль для этого аккаунта не задан');

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('Текущий пароль указан неверно');

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword)
      throw new BadRequestException(
        'Новый пароль должен отличаться от текущего',
      );

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await this.auditService.log({
      userId,
      action: 'CHANGE_PASSWORD',
      entityType: 'User',
      entityId: userId,
    });

    this.logger.log(`Пароль пользователя ${userId} изменен`);
    return { message: 'Пароль успешно изменен' };
  }
}
