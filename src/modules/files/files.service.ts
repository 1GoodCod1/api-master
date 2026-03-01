import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../shared/database/prisma.service';
import { getEffectiveTariff } from '../../common/helpers/plans';
import { validateFileMagic, unlinkIfExists } from '../shared/utils/file-magic';

type UploadFileResult = Awaited<ReturnType<FilesService['uploadFile']>>;
type UploadedDto = UploadFileResult extends { data: infer D }
  ? D
  : UploadFileResult;

@Injectable()
export class FilesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private isImage(mimetype?: string) {
    return String(mimetype || '').startsWith('image/');
  }

  private async addToMasterGalleryIfPossible(userId: string, fileId: string) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      include: { user: { select: { isVerified: true } } },
    });
    if (!master) return null;

    // Проверяем верификацию для мастеров - только верифицированные могут добавлять фото в галерею
    // Если мастер не верифицирован, просто не добавляем фото в галерею (но файл всё равно загружается)
    // Это позволяет загружать файлы для верификации
    if (!master.user.isVerified) {
      return null; // Не добавляем в галерею, но не блокируем загрузку файла
    }

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

  private async addToClientGalleryIfPossible(userId: string, fileId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, avatarFileId: true },
    });

    // Добавляем фото в галерею только для клиентов
    if (!user || user.role !== 'CLIENT') return null;

    const exists = await this.prisma.clientPhoto.findUnique({
      where: { userId_fileId: { userId: user.id, fileId } },
    });
    if (exists) return user;

    // Лимит для клиентов: 10 фото
    // Если лимит достигнут - просто не добавляем в галерею, но не блокируем загрузку
    const CLIENT_PHOTO_LIMIT = 10;
    const count = await this.prisma.clientPhoto.count({
      where: { userId: user.id },
    });

    if (count >= CLIENT_PHOTO_LIMIT) {
      // Лимит достигнут - пропускаем добавление в галерею, но загрузка продолжается
      return user;
    }

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

  async uploadFile(
    file: Express.Multer.File,
    userId?: string,
    options?: { skipClientGallery?: boolean },
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    // Проверка по magic bytes (только при локальном file.path; для S3 — только по расширению в fileFilter)
    if (file.path) {
      try {
        await validateFileMagic(file.path, file.originalname);
      } catch (e) {
        await unlinkIfExists(file.path);
        throw new BadRequestException(
          e instanceof Error ? e.message : 'Invalid file content',
        );
      }
    }

    // S3/B2: multer-s3 sets file.location with full public URL; local: use file.path
    let fileUrl: string =
      (file as Express.Multer.File & { location?: string }).location ||
      file.path ||
      '';

    if (fileUrl && !String(fileUrl).startsWith('http')) {
      const normalized = String(fileUrl).replace(/\\/g, '/');
      if (normalized.startsWith('uploads/')) fileUrl = '/' + normalized;
      const idx = normalized.lastIndexOf('/uploads/');
      if (idx !== -1) fileUrl = normalized.slice(idx);
    }
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
        // Для мастеров
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

        // Для клиентов (не добавляем в галерею, если загрузка для лида/вложений)
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
      // откатим запись file, чтобы не копить мусор
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
  ) {
    if (!Array.isArray(files) || files.length === 0)
      return { items: [] as UploadedDto[] };
    if (files.length > 10)
      throw new BadRequestException('Maximum 10 files allowed');

    const items: UploadedDto[] = [];

    for (const f of files) {
      const saved = await this.uploadFile(f, userId ?? undefined, options);
      const item: UploadedDto =
        typeof saved === 'object' && saved !== null && 'data' in saved
          ? (saved as { data: UploadedDto }).data
          : (saved as UploadedDto);
      items.push(item);
    }

    return { items };
  }

  private getPhotoLimitForTariff(t: 'BASIC' | 'VIP' | 'PREMIUM') {
    if (t === 'BASIC') return 5;
    if (t === 'VIP') return 10;
    return 15; // PREMIUM
  }
}
