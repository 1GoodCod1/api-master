import { Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import { UserRole } from '@prisma/client';
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
    if (!user) throw AppErrors.notFound(AppErrorMessages.USER_NOT_FOUND);

    if (!fileId || fileId.trim() === '') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarFileId: null },
      });
      if (user.role === UserRole.MASTER) {
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
    if (!file) throw AppErrors.notFound(AppErrorMessages.FILE_NOT_FOUND);

    if (file.uploadedById !== userId) {
      throw AppErrors.badRequest(AppErrorMessages.FILE_OWN_AVATAR_ONLY);
    }

    if (!String(file.mimetype).startsWith('image/')) {
      throw AppErrors.badRequest(AppErrorMessages.AVATAR_MUST_BE_IMAGE);
    }

    if (user.role === UserRole.CLIENT) {
      await this.saveClientPhoto(user.id, fileId);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarFileId: fileId },
    });

    if (user.role === UserRole.MASTER) {
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

    if (user?.role !== UserRole.CLIENT) {
      throw AppErrors.notFound(AppErrorMessages.CLIENT_PROFILE_NOT_FOUND);
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
