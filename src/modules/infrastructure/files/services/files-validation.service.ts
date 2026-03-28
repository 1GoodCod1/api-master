import { Injectable } from '@nestjs/common';
import {
  AppErrors,
  AppErrorMessages,
  AppErrorTemplates,
} from '../../../../common/errors';
import {
  validateFileMagic,
  validateLeadImageMagic,
  unlinkIfExists,
} from '../../../shared/utils/file-magic';
import { FILES_MAX_FILES_PER_BATCH } from '../../../../common/constants';

/**
 * Сервис валидации файлов.
 * Отвечает за: проверка magic bytes, лимиты загрузки.
 */
@Injectable()
export class FilesValidationService {
  /**
   * Проверить файл по magic bytes (защита от подмены расширения).
   * При ошибке удаляет файл с диска и выбрасывает BadRequestException.
   */
  async assertValidFileContent(
    file: Express.Multer.File,
    mode: 'default' | 'leadImage' = 'default',
  ): Promise<void> {
    if (!file.path) return;

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
