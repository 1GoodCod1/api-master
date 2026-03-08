import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersManageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Обновить данные пользователя
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  /**
   * Удалить пользователя
   */
  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
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

  private async invalidateCache(userId: string) {
    await this.cache.del(this.cache.keys.userMasterProfile(userId));
    await this.cache.del(this.cache.keys.userProfile(userId));
  }
}
