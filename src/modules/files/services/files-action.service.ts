import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { getEffectiveTariff } from '../../../common/helpers/plans';
import { FilesValidationService } from './files-validation.service';

const CLIENT_PHOTO_LIMIT = 10;

type UploadedDto = {
  id: string;
  path: string;
  url: string;
  filename: string;
  size: number;
  mimetype: string;
};

/**
 * Сервис мутаций файлов.
 * Отвечает за: загрузка, добавление в галереи мастера/клиента.
 */
@Injectable()
export class FilesActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: FilesValidationService,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    userId?: string,
    options?: { skipClientGallery?: boolean },
  ): Promise<UploadedDto> {
    this.validationService.assertFilePresent(file);
    await this.validationService.assertValidFileContent(file);

    const fileUrl = this.normalizeFileUrl(file);
    const fileRecord = await this.prisma.file.create({
      data: {
        filename: file.originalname,
        path: fileUrl,
        mimetype: file.mimetype,
        size: file.size,
        uploadedById: userId,
      },
    });

    try {
      if (userId && this.isImage(fileRecord.mimetype)) {
        const master = await this.addToMasterGalleryIfPossible(
          userId,
          fileRecord.id,
        );
        if (master && !master.avatarFileId) {
          await this.prisma.master.update({
            where: { id: master.id },
            data: { avatarFileId: fileRecord.id },
          });
        }

        const client =
          options?.skipClientGallery !== true
            ? await this.addToClientGalleryIfPossible(userId, fileRecord.id)
            : null;
        if (client && !client.avatarFileId) {
          await this.prisma.user.update({
            where: { id: client.id },
            data: { avatarFileId: fileRecord.id },
          });
        }
      }
    } catch (e) {
      await this.prisma.file
        .delete({ where: { id: fileRecord.id } })
        .catch(() => {});
      throw e;
    }

    return {
      id: fileRecord.id,
      path: fileUrl,
      url: fileUrl,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async uploadMany(
    files: Express.Multer.File[],
    userId: string | null,
    options?: { skipClientGallery?: boolean },
  ): Promise<{ items: UploadedDto[] }> {
    if (!Array.isArray(files) || files.length === 0) {
      return { items: [] };
    }
    this.validationService.assertMaxFiles(files);

    const items: UploadedDto[] = [];
    for (const f of files) {
      const saved = await this.uploadFile(f, userId ?? undefined, options);
      items.push(saved);
    }
    return { items };
  }

  private isImage(mimetype?: string): boolean {
    return String(mimetype || '').startsWith('image/');
  }

  private normalizeFileUrl(file: Express.Multer.File): string {
    const fileWithLocation = file as Express.Multer.File & {
      location?: string;
    };
    let fileUrl = fileWithLocation.location || file.path || '';

    if (fileUrl && !String(fileUrl).startsWith('http')) {
      const normalized = String(fileUrl).replace(/\\/g, '/');
      if (normalized.startsWith('uploads/')) fileUrl = '/' + normalized;
      const idx = normalized.lastIndexOf('/uploads/');
      if (idx !== -1) fileUrl = normalized.slice(idx);
    }
    return fileUrl;
  }

  private getPhotoLimitForTariff(t: 'BASIC' | 'VIP' | 'PREMIUM'): number {
    if (t === 'BASIC') return 5;
    if (t === 'VIP') return 10;
    return 15; // PREMIUM
  }

  private async addToMasterGalleryIfPossible(
    userId: string,
    fileId: string,
  ): Promise<{ id: string; avatarFileId: string | null } | null> {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      include: { user: { select: { isVerified: true } } },
    });
    if (!master) return null;
    if (!master.user.isVerified) return null;

    const exists = await this.prisma.masterPhoto.findUnique({
      where: { masterId_fileId: { masterId: master.id, fileId } },
    });
    if (exists) return master;

    const tariff = getEffectiveTariff(master);
    const baseLimit = this.getPhotoLimitForTariff(tariff);
    const extraPhotos = master.extraPhotosCount || 0;
    const totalLimit = baseLimit + extraPhotos;

    const count = await this.prisma.masterPhoto.count({
      where: { masterId: master.id },
    });
    if (count >= totalLimit) {
      throw new BadRequestException(
        `Photo limit reached for your plan (${count}/${totalLimit}). Upgrade your plan or buy extra photos to add more.`,
      );
    }

    const maxOrderRow = await this.prisma.masterPhoto.findFirst({
      where: { masterId: master.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrderRow?.order ?? 0) + 1;

    await this.prisma.masterPhoto.create({
      data: { masterId: master.id, fileId, order: nextOrder },
    });
    return master;
  }

  private async addToClientGalleryIfPossible(
    userId: string,
    fileId: string,
  ): Promise<{ id: string; avatarFileId: string | null } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, avatarFileId: true },
    });
    if (!user || user.role !== 'CLIENT') return null;

    const exists = await this.prisma.clientPhoto.findUnique({
      where: { userId_fileId: { userId: user.id, fileId } },
    });
    if (exists) return user;

    const count = await this.prisma.clientPhoto.count({
      where: { userId: user.id },
    });
    if (count >= CLIENT_PHOTO_LIMIT) return user;

    const maxOrderRow = await this.prisma.clientPhoto.findFirst({
      where: { userId: user.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrderRow?.order ?? 0) + 1;

    await this.prisma.clientPhoto.create({
      data: { userId: user.id, fileId, order: nextOrder },
    });
    return user;
  }
}
