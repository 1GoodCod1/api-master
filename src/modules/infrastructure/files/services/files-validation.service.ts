import { Injectable, Logger } from '@nestjs/common';
import {
  AppErrors,
  AppErrorMessages,
  AppErrorTemplates,
} from '../../../../common/errors';
import {
  validateFileMagic,
  validateLeadImageMagic,
  validateMagicFromBuffer,
  validateLeadImageMagicFromBuffer,
  unlinkIfExists,
} from '../../../shared/utils/file-magic';
import { FILES_MAX_FILES_PER_BATCH } from '../../../../common/constants';
import { StorageService } from './storage.service';

/**
 * Сервис валидации файлов.
 * Отвечает за: проверка magic bytes (локальный диск + S3), лимиты загрузки.
 */
@Injectable()
export class FilesValidationService {
  private readonly logger = new Logger(FilesValidationService.name);

  constructor(private readonly storageService: StorageService) {}

  /**
   * Проверить файл по magic bytes (защита от подмены расширения).
   * Для локальных файлов — читает с диска.
   * Для S3 — скачивает первые 12 байт через Range GET и проверяет.
   * При ошибке удаляет файл и выбрасывает BadRequestException.
   */
  async assertValidFileContent(
    file: Express.Multer.File,
    mode: 'default' | 'leadImage' = 'default',
  ): Promise<void> {
    const fileWithLocation = file as Express.Multer.File & {
      location?: string;
      key?: string;
      bucket?: string;
    };

    // Локальный файл — валидация через path (как раньше)
    if (file.path) {
      try {
        if (mode === 'leadImage') {
          await validateLeadImageMagic(file.path, file.originalname);
        } else {
          await validateFileMagic(file.path, file.originalname);
        }
      } catch (e) {
        await unlinkIfExists(file.path);
        throw AppErrors.badRequest(
          AppErrorTemplates.invalidFileContent(
            e instanceof Error ? e.message : 'Invalid file content',
          ),
        );
      }
      return;
    }

    // S3 файл — скачиваем первые 12 байт и проверяем
    const s3Url = fileWithLocation.location;
    if (!s3Url) return;

    try {
      const head = await this.storageService.getFileHeadBytes(s3Url, 12);
      if (!head || head.length === 0) {
        this.logger.warn(
          `Could not read head bytes for S3 file: ${file.originalname}`,
        );
        return; // не блокируем если не смогли прочитать (graceful degradation)
      }

      if (mode === 'leadImage') {
        validateLeadImageMagicFromBuffer(head, file.originalname);
      } else {
        validateMagicFromBuffer(head, file.originalname);
      }
    } catch (e) {
      // Невалидный файл — удаляем из S3
      await this.storageService.deleteFromStorage(s3Url);
      throw AppErrors.badRequest(
        AppErrorTemplates.invalidFileContent(
          e instanceof Error ? e.message : 'Invalid file content',
        ),
      );
    }
  }

  /**
   * Проверить, что массив файлов не превышает лимит.
   */
  assertMaxFiles(files: Express.Multer.File[]): void {
    if (files.length > FILES_MAX_FILES_PER_BATCH) {
      throw AppErrors.badRequest(AppErrorMessages.FILES_MAX_10);
    }
  }

  /**
   * Проверить, что файл передан.
   */
  assertFilePresent(file: Express.Multer.File | undefined): void {
    if (!file) {
      throw AppErrors.badRequest(AppErrorMessages.FILES_NONE_UPLOADED);
    }
  }
}
