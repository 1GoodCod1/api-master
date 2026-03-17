import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class MastersPhotosService {
  private readonly logger = new Logger(MastersPhotosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMasterPhotos(masterIdOrSlug: string, limit = 15) {
    try {
      // Пытаемся найти по slug, если не найдено - по id
      let m = await this.prisma.master.findUnique({
        where: { slug: masterIdOrSlug },
        select: {
          id: true,
          avatarFileId: true,
          photos: {
            orderBy: { createdAt: 'desc' },
            take: Math.min(15, Math.max(1, Number(limit) || 15)),
            select: {
              file: true,
            },
          },
        },
      });

      // Если не найдено по slug, пробуем по id
      if (!m) {
        m = await this.prisma.master.findUnique({
          where: { id: masterIdOrSlug },
          select: {
            id: true,
            avatarFileId: true,
            photos: {
              orderBy: { createdAt: 'desc' },
              take: Math.min(15, Math.max(1, Number(limit) || 15)),
              select: {
                file: true,
              },
            },
          },
        });
      }

      if (!m) throw new NotFoundException('Master not found');

      return {
        avatarFileId: m.avatarFileId ?? null,
        items: m.photos.map((p: { file: { id: string } }) => p.file),
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error('getMasterPhotos failed', err);
      throw err;
    }
  }

  async getMyPhotos(userId: string) {
    try {
      const master = await this.prisma.master.findUnique({ where: { userId } });
      if (!master) throw new NotFoundException('Master profile not found');

      const rows = await this.prisma.masterPhoto.findMany({
        where: { masterId: master.id },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        take: 15,
        include: { file: true },
      });

      return {
        avatarFileId: master.avatarFileId ?? null,
        items: rows.map((r) => r.file),
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error('getMyPhotos failed', err);
      throw err;
    }
  }

  async removeMyPhoto(
    userId: string,
    fileId: string,
    onCacheInvalidate?: (
      masterId: string,
      slug: string | null,
    ) => Promise<void>,
  ) {
    try {
      const master = await this.prisma.master.findUnique({ where: { userId } });
      if (!master) throw new NotFoundException('Master profile not found');

      await this.prisma.masterPhoto.deleteMany({
        where: { masterId: master.id, fileId },
      });

      // Если удалили аватар — ставим первое оставшееся фото
      if (master.avatarFileId === fileId) {
        const remainingPhotos = await this.prisma.masterPhoto.findMany({
          where: { masterId: master.id },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
          take: 1,
          select: { fileId: true },
        });
        const newAvatarFileId = remainingPhotos[0]?.fileId ?? null;
        await this.prisma.master.update({
          where: { id: master.id },
          data: { avatarFileId: newAvatarFileId },
        });
      }

      // Инвалидируем кеш профиля (фото изменились)
      if (onCacheInvalidate) {
        await onCacheInvalidate(master.id, master.slug);
      }

      return { ok: true };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error('removeMyPhoto failed', err);
      throw err;
    }
  }

  async setMyAvatar(
    userId: string,
    fileId: string,
    onCacheInvalidate?: (
      masterId: string,
      slug: string | null,
    ) => Promise<void>,
  ) {
    try {
      const master = await this.prisma.master.findUnique({ where: { userId } });
      if (!master) throw new NotFoundException('Master profile not found');

      const file = await this.prisma.file.findUnique({ where: { id: fileId } });
      if (!file) throw new NotFoundException('File not found');

      if (file.uploadedById !== userId)
        throw new BadRequestException(
          'You can only use your own file as avatar',
        );

      if (!String(file.mimetype).startsWith('image/'))
        throw new BadRequestException('Avatar must be an image');

      const count = await this.prisma.masterPhoto.count({
        where: { masterId: master.id },
      });
      const exists = await this.prisma.masterPhoto.findUnique({
        where: { masterId_fileId: { masterId: master.id, fileId } },
      });

      if (!exists) {
        if (count >= 15)
          throw new BadRequestException('Gallery limit reached (15)');
        await this.prisma.masterPhoto.create({
          data: { masterId: master.id, fileId, order: 0 },
        });
      }

      await this.prisma.master.update({
        where: { id: master.id },
        data: { avatarFileId: fileId },
      });

      // Инвалидируем кеш профиля (аватар изменился)
      if (onCacheInvalidate) {
        await onCacheInvalidate(master.id, master.slug);
      }

      return { ok: true };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error('setMyAvatar failed', err);
      throw err;
    }
  }
}
