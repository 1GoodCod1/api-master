import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersManageService {
  private readonly logger = new Logger(UsersManageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Обновить данные пользователя
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });

      if (!user) {
        throw new NotFoundException('Пользователь не найден');
      }

      return await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error('update failed', err);
      throw err;
    }
  }

  /**
   * Удалить пользователя
   */
  async remove(id: string) {
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (err) {
      this.logger.error('remove failed', err);
      throw err;
    }
  }

  /**
   * Переключить состояние блокировки пользователя
   */
  async toggleBan(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isBanned: !user.isBanned },
    });

    await this.invalidateCache(id);
    return updated;
  }

  /**
   * Переключить состояние верификации пользователя.
   * Сейчас при верификации только isVerified + pendingVerification.
   * ПОЗЖЕ ВАЖНО! Ниже закомментирована автовыдача Premium на 1 месяц — раскомментировать при включении.
   */
  async toggleVerify(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { masterProfile: { select: { id: true } } },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const newVerified = !user.isVerified;
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isVerified: newVerified },
    });

    if (newVerified && user.role === 'MASTER' && user.masterProfile) {
      await this.prisma.master.update({
        where: { id: user.masterProfile.id },
        data: { pendingVerification: false },
      });
      // ПОЗЖЕ ВАЖНО! Автовыдача Premium при верификации — раскомментировать при включении:
      // const expiresAt = new Date();
      // expiresAt.setMonth(expiresAt.getMonth() + 1);
      // await this.prisma.master.update({
      //   where: { id: user.masterProfile.id },
      //   data: {
      //     tariffType: 'PREMIUM',
      //     tariffExpiresAt: expiresAt,
      //     lifetimePremium: false,
      //     isFeatured: true,
      //     pendingVerification: false,
      //   },
      // });
    }

    await this.invalidateCache(id);
    return updated;
  }

  /**
   * Установить предпочитаемый язык для email-шаблонов
   */
  async setPreferredLanguage(
    userId: string,
    lang: 'en' | 'ru' | 'ro',
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferredLanguage: lang },
    });
  }

  /**
   * Установить или удалить аватар пользователя
   */
  async setAvatar(userId: string, fileId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, avatarFileId: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');

    if (!fileId || fileId.trim() === '') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarFileId: null },
      });
      return this.getUpdatedUser(userId);
    }

    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('Файл не найден');

    if (file.uploadedById !== userId) {
      throw new BadRequestException(
        'Вы можете использовать только свои собственные файлы в качестве аватара',
      );
    }

    if (!String(file.mimetype).startsWith('image/')) {
      throw new BadRequestException('Аватар должен быть изображением');
    }

    if (user.role === 'CLIENT') {
      await this.saveClientPhoto(user.id, fileId);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarFileId: fileId },
    });

    return this.getUpdatedUser(userId);
  }

  /**
   * Удалить фотографию из профиля клиента
   */
  async removeMyPhoto(userId: string, fileId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, avatarFileId: true },
    });

    if (!user || user.role !== 'CLIENT') {
      throw new NotFoundException('Профиль клиента не найден');
    }

    await this.prisma.clientPhoto.deleteMany({
      where: { userId: user.id, fileId },
    });

    if (user.avatarFileId === fileId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { avatarFileId: null },
      });
    }

    return { ok: true };
  }

  private async saveClientPhoto(userId: string, fileId: string) {
    const exists = await this.prisma.clientPhoto.findUnique({
      where: { userId_fileId: { userId, fileId } },
    });

    if (!exists) {
      const count = await this.prisma.clientPhoto.count({
        where: { userId },
      });

      if (count < 10) {
        const maxOrderRow = await this.prisma.clientPhoto.findFirst({
          where: { userId },
          orderBy: { order: 'desc' },
          select: { order: true },
        });
        const nextOrder = (maxOrderRow?.order ?? 0) + 1;

        await this.prisma.clientPhoto.create({
          data: { userId, fileId, order: nextOrder },
        });
      }
    }
  }

  private async getUpdatedUser(userId: string) {
    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
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
      },
    });

    return {
      user: updatedUser,
    };
  }

  /**
   * GDPR Art. 17 — право на удаление собственного аккаунта.
   * Каскадное удаление через Prisma (onDelete: Cascade) очистит все связанные данные.
   */
  async removeSelf(userId: string): Promise<{ ok: true }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role === 'ADMIN') {
        throw new BadRequestException(
          'Admin accounts cannot be self-deleted. Contact another admin.',
        );
      }

      await this.prisma.user.delete({ where: { id: userId } });
      await this.invalidateCache(userId);

      this.logger.log(
        `User ${userId} self-deleted their account (GDPR erasure)`,
      );
      return { ok: true };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error('removeSelf failed', err);
      throw err;
    }
  }

  /**
   * GDPR Art. 20 — право на переносимость данных.
   * Возвращает все персональные данные пользователя в машинночитаемом формате.
   */
  async exportPersonalData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [
      masterProfile,
      leads,
      reviews,
      bookings,
      loginHistory,
      favorites,
      notifications,
    ] = await Promise.all([
      this.prisma.master.findUnique({
        where: { userId },
        select: {
          description: true,
          experienceYears: true,
          cityId: true,
          categoryId: true,
          telegramChatId: true,
          whatsappPhone: true,
          latitude: true,
          longitude: true,
          createdAt: true,
        },
      }),
      this.prisma.lead.findMany({
        where: { clientId: userId },
        select: {
          id: true,
          message: true,
          clientPhone: true,
          clientName: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.review.findMany({
        where: { clientId: userId },
        select: {
          id: true,
          rating: true,
          comment: true,
          clientPhone: true,
          clientName: true,
          createdAt: true,
        },
      }),
      this.prisma.booking.findMany({
        where: { clientId: userId },
        select: {
          id: true,
          clientPhone: true,
          clientName: true,
          startTime: true,
          endTime: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.loginHistory.findMany({
        where: { userId },
        select: {
          ipAddress: true,
          userAgent: true,
          location: true,
          success: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.favorite.findMany({
        where: { userId },
        select: { masterId: true, createdAt: true },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        select: {
          type: true,
          message: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    return {
      exportDate: new Date().toISOString(),
      user,
      masterProfile,
      leads,
      reviews,
      bookings,
      loginHistory,
      favorites,
      notifications,
    };
  }

  private async invalidateCache(userId: string) {
    await this.cache.del(this.cache.keys.userMasterProfile(userId));
    await this.cache.del(this.cache.keys.userProfile(userId));
  }
}
