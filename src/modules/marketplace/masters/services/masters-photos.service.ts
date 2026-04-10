import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { PrismaService } from '../../../shared/database/prisma.service';
import { StorageService } from '../../../infrastructure/files/services/storage.service';
import { SORT_ASC, SORT_DESC } from '../../../../common/constants';
import { fireAndForget } from '../../../../common/utils/fire-and-forget';

@Injectable()
export class MastersPhotosService {
  private readonly logger = new Logger(MastersPhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getMasterPhotos(masterIdOrSlug: string, limit = 15) {
    try {
      // Пытаемся найти по slug, если не найдено - по id
      let m = await this.prisma.master.findUnique({
        where: { slug: masterIdOrSlug },
        select: {
          id: true,
          avatarFileId: true,
          photos: {
            orderBy: { createdAt: SORT_DESC },
            take: Math.min(15, Math.max(1, Number(limit) || 15)),
            select: {
              file: true,
            },
          },
        },
      });

      // Если не найдено по slug, пробуем по id
      m ??= await this.prisma.master.findUnique({
        where: { id: masterIdOrSlug },
        select: {
          id: true,
          avatarFileId: true,
          photos: {
            orderBy: { createdAt: SORT_DESC },
            take: Math.min(15, Math.max(1, Number(limit) || 15)),
            select: {
              file: true,
            },
          },
        },
      });

      if (!m) throw AppErrors.notFound(AppErrorMessages.MASTER_NOT_FOUND);

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
      if (!master)
        throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);

      const rows = await this.prisma.masterPhoto.findMany({
        where: { masterId: master.id },
        orderBy: [{ order: SORT_ASC }, { createdAt: SORT_DESC }],
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
      if (!master)
        throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);

      await this.prisma.masterPhoto.deleteMany({
        where: { masterId: master.id, fileId },
      });

      // Если удалили аватар — ставим первое оставшееся фото
      if (master.avatarFileId === fileId) {
        const remainingPhotos = await this.prisma.masterPhoto.findMany({
          where: { masterId: master.id },
          orderBy: [{ order: SORT_ASC }, { createdAt: SORT_DESC }],
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

      // Удаляем файл из хранилища если он больше нигде не используется
      fireAndForget(
        this.storageService.deleteOrphanedFile(fileId),
        this.logger,
        `deleteOrphanedFile(${fileId})`,
      );

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
      if (!master)
        throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);

      const file = await this.prisma.file.findUnique({ where: { id: fileId } });
      if (!file) throw AppErrors.notFound(AppErrorMessages.FILE_NOT_FOUND);

      if (file.uploadedById !== userId)
        throw AppErrors.badRequest(AppErrorMessages.FILE_OWN_AVATAR_ONLY);

      if (!String(file.mimetype).startsWith('image/'))
        throw AppErrors.badRequest(AppErrorMessages.AVATAR_MUST_BE_IMAGE);

      const count = await this.prisma.masterPhoto.count({
        where: { masterId: master.id },
      });
      const exists = await this.prisma.masterPhoto.findUnique({
        where: { masterId_fileId: { masterId: master.id, fileId } },
      });

      if (!exists) {
        if (count >= 15)
          throw AppErrors.badRequest(AppErrorMessages.GALLERY_LIMIT_15);
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
