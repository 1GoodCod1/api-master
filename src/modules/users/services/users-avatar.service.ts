import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';

@Injectable()
export class UsersAvatarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

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
      if (user.role === 'MASTER') {
        const master = await this.prisma.master.findUnique({
          where: { userId },
          select: { id: true, slug: true },
        });
        if (master) {
          await this.prisma.master.update({
            where: { id: master.id },
            data: { avatarFileId: null },
          });
          await this.cache.invalidateMasterRelated(master.id, {
            old: master.slug,
            new: master.slug,
          });
        }
      }
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

    if (user.role === 'MASTER') {
      const master = await this.prisma.master.findUnique({
        where: { userId },
        select: { id: true, slug: true },
      });
      if (master) {
        await this.prisma.master.update({
          where: { id: master.id },
          data: { avatarFileId: fileId },
        });
        await this.cache.invalidateMasterRelated(master.id, {
          old: master.slug,
          new: master.slug,
        });
      }
    }

    return this.getUpdatedUser(userId);
  }

  async removeMyPhoto(userId: string, fileId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, avatarFileId: true },
    });

    if (user?.role !== 'CLIENT') {
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
}
