import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { unlink, writeFile, mkdir, readdir, stat, readFile } from 'fs/promises';
import * as path from 'path';
import * as fs from 'fs';
import type { Readable } from 'stream';
import { PrismaService } from '../../../shared/database/prisma.service';

/**
 * Единый сервис для работы с файловым хранилищем (Backblaze B2 / локальный диск).
 * Кеширует S3-клиент, предоставляет методы удаления и чтения заголовков.
 */
@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client | null = null;
  private readonly b2Bucket: string;
  private readonly isB2: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const keyId = this.configService.get<string>('b2.applicationKeyId');
    const key = this.configService.get<string>('b2.applicationKey');
    this.b2Bucket = this.configService.get<string>('b2.bucket') || '';
    this.isB2 = !!(keyId && key && this.b2Bucket);

    if (this.isB2) {
      const region =
        this.configService.get<string>('b2.region') || 'eu-central-003';
      const customEndpoint = this.configService.get<string>('b2.endpoint');
      const endpoint =
        customEndpoint?.trim() || `https://s3.${region}.backblazeb2.com`;

      this.s3 = new S3Client({
        credentials: { accessKeyId: keyId!, secretAccessKey: key! },
        region,
        endpoint,
        forcePathStyle: true,
      });
    }
  }

  onModuleDestroy() {
    this.s3?.destroy();
  }

  /** true если хранилище — Backblaze B2 (продакшн) */
  get usingB2(): boolean {
    return this.isB2;
  }

  /**
   * Извлечь S3 key из полного URL файла в B2.
   * https://s3.eu-central-003.backblazeb2.com/bucket/uploads/uuid.jpg → uploads/uuid.jpg
   */
  extractKeyFromUrl(fileUrl: string): string {
    const url = new URL(fileUrl);
    // forcePathStyle: /bucket-name/key → убираем первый сегмент (bucket)
    return url.pathname.replace(/^\/[^/]+\//, '');
  }

  /**
   * Прочитать первые N байт файла из хранилища.
   * Для S3 — Range GET, для локального диска — fs.read.
   */
  async getFileHeadBytes(
    filePathOrUrl: string,
    bytes = 12,
  ): Promise<Buffer | null> {
    try {
      if (filePathOrUrl.startsWith('http')) {
        if (!this.s3) return null;
        const key = this.extractKeyFromUrl(filePathOrUrl);
        const resp = await this.s3.send(
          new GetObjectCommand({
            Bucket: this.b2Bucket,
            Key: key,
            Range: `bytes=0-${bytes - 1}`,
          }),
        );
        if (!resp.Body) return null;
        const chunks: Uint8Array[] = [];
        for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      }

      // Локальный файл — читаем напрямую
      const { open } = await import('fs/promises');
      const fh = await open(filePathOrUrl, 'r');
      try {
        const buf = Buffer.alloc(bytes);
        await fh.read(buf, 0, bytes, 0);
        return buf;
      } finally {
        await fh.close();
      }
    } catch (err) {
      this.logger.warn(
        `Failed to read file head: ${filePathOrUrl}`,
        err instanceof Error ? err.message : String(err),
      );
      return null;
    }
  }

  /**
   * Удалить файл из хранилища (B2 или локальный диск).
   */
  async deleteFromStorage(filePath: string): Promise<void> {
    try {
      if (filePath.startsWith('http')) {
        if (!this.s3) return;
        const key = this.extractKeyFromUrl(filePath);
        await this.s3.send(
          new DeleteObjectCommand({ Bucket: this.b2Bucket, Key: key }),
        );
      } else {
        const localPath = filePath.startsWith('/') ? `.${filePath}` : filePath;
        await unlink(localPath).catch(() => {});
      }
    } catch (err) {
      this.logger.warn(
        `Failed to delete file from storage: ${filePath}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  /**
   * Загрузить буфер в хранилище.
   * В B2 — PutObject, в dev — запись на диск.
   * @returns Полный URL (B2) или локальный путь.
   */
  async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.b2Bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ContentDisposition: 'attachment',
        }),
      );
      const region =
        this.configService.get<string>('b2.region') || 'eu-central-003';
      const customEndpoint = this.configService.get<string>('b2.endpoint');
      const endpoint =
        customEndpoint?.trim() || `https://s3.${region}.backblazeb2.com`;
      return `${endpoint}/${this.b2Bucket}/${key}`;
    }

    // Dev: запись на локальный диск
    const localPath = path.join(process.cwd(), key);
    await mkdir(path.dirname(localPath), { recursive: true });
    await writeFile(localPath, buffer);
    return localPath;
  }

  /**
   * Получить содержимое файла как Buffer.
   * Для B2 — GetObject, для локального диска — fs.readFile.
   */
  async getFileBuffer(keyOrPath: string): Promise<Buffer> {
    if (keyOrPath.startsWith('http')) {
      if (!this.s3) throw new Error('S3 client not configured');
      const key = this.extractKeyFromUrl(keyOrPath);
      const resp = await this.s3.send(
        new GetObjectCommand({ Bucket: this.b2Bucket, Key: key }),
      );
      if (!resp.Body) throw new Error('Empty response body from S3');
      const chunks: Uint8Array[] = [];
      for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }

    // Локальный файл
    return readFile(keyOrPath);
  }

  /**
   * Получить read stream файла для стриминга в HTTP response.
   * Для B2 — GetObject stream, для локального — fs.createReadStream.
   */
  async getFileStream(
    keyOrPath: string,
  ): Promise<{ stream: Readable; size: number; contentType: string }> {
    if (keyOrPath.startsWith('http')) {
      if (!this.s3) throw new Error('S3 client not configured');
      const key = this.extractKeyFromUrl(keyOrPath);
      const resp = await this.s3.send(
        new GetObjectCommand({ Bucket: this.b2Bucket, Key: key }),
      );
      if (!resp.Body) throw new Error('Empty response body from S3');
      return {
        stream: resp.Body as Readable,
        size: resp.ContentLength ?? 0,
        contentType: resp.ContentType ?? 'application/octet-stream',
      };
    }

    // Локальный файл
    const stats = await stat(keyOrPath);
    return {
      stream: fs.createReadStream(keyOrPath),
      size: stats.size,
      contentType: 'application/octet-stream',
    };
  }

  /**
   * Список файлов по префиксу.
   * Для B2 — ListObjectsV2, для локального — readdir.
   */
  async listFiles(
    prefix: string,
  ): Promise<{ key: string; size: number; lastModified: Date }[]> {
    if (this.s3) {
      const resp = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.b2Bucket,
          Prefix: prefix,
        }),
      );
      return (resp.Contents ?? []).map((obj) => ({
        key: obj.Key ?? '',
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ?? new Date(),
      }));
    }

    // Dev: читаем локальную директорию
    const dirPath = path.join(process.cwd(), prefix);
    try {
      const entries = await readdir(dirPath);
      const results = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dirPath, entry);
          const s = await stat(fullPath);
          return {
            key: `${prefix}${entry}`,
            size: s.size,
            lastModified: s.mtime,
          };
        }),
      );
      return results;
    } catch {
      return [];
    }
  }

  /**
   * Удалить файл по ключу (не по URL).
   */
  async deleteByKey(key: string): Promise<void> {
    if (this.s3) {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.b2Bucket, Key: key }),
      );
    } else {
      const localPath = path.join(process.cwd(), key);
      await unlink(localPath).catch(() => {});
    }
  }

  /**
   * Удалить файл из хранилища И из БД, только если он больше нигде не используется.
   * Возвращает true если файл был удалён.
   */
  async deleteOrphanedFile(fileId: string): Promise<boolean> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, path: true },
    });
    if (!file) return false;

    // Проверяем все возможные ссылки на файл
    const [
      masterAvatar,
      masterPhoto,
      clientPhoto,
      userAvatar,
      leadFile,
      reviewFile,
      messageFile,
      portfolioBefore,
      portfolioAfter,
      verDocFront,
      verDocBack,
      verSelfie,
    ] = await Promise.all([
      this.prisma.master.count({ where: { avatarFileId: fileId } }),
      this.prisma.masterPhoto.count({ where: { fileId } }),
      this.prisma.clientPhoto.count({ where: { fileId } }),
      this.prisma.user.count({ where: { avatarFileId: fileId } }),
      this.prisma.leadFile.count({ where: { fileId } }),
      this.prisma.reviewFile.count({ where: { fileId } }),
      this.prisma.messageFile.count({ where: { fileId } }),
      this.prisma.portfolioItem.count({ where: { beforeFileId: fileId } }),
      this.prisma.portfolioItem.count({ where: { afterFileId: fileId } }),
      this.prisma.masterVerification.count({
        where: { documentFrontId: fileId },
      }),
      this.prisma.masterVerification.count({
        where: { documentBackId: fileId },
      }),
      this.prisma.masterVerification.count({ where: { selfieId: fileId } }),
    ]);

    const totalRefs =
      masterAvatar +
      masterPhoto +
      clientPhoto +
      userAvatar +
      leadFile +
      reviewFile +
      messageFile +
      portfolioBefore +
      portfolioAfter +
      verDocFront +
      verDocBack +
      verSelfie;

    if (totalRefs > 0) return false;

    await this.deleteFromStorage(file.path);
    await this.prisma.file.delete({ where: { id: fileId } }).catch(() => {});
    return true;
  }
}
