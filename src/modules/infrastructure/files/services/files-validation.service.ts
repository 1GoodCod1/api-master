import { Injectable, BadRequestException } from '@nestjs/common';
import {
  validateFileMagic,
  unlinkIfExists,
} from '../../../shared/utils/file-magic';

const MAX_FILES_PER_BATCH = 10;

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
  async assertValidFileContent(file: Express.Multer.File): Promise<void> {
    if (!file.path) return;

    try {
      await validateFileMagic(file.path, file.originalname);
    } catch (e) {
      await unlinkIfExists(file.path);
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid file content',
      );
    }
  }

  /**
   * Проверить, что массив файлов не превышает лимит.
   */
  assertMaxFiles(files: Express.Multer.File[]): void {
    if (files.length > MAX_FILES_PER_BATCH) {
      throw new BadRequestException('Maximum 10 files allowed');
    }
  }

  /**
   * Проверить, что файл передан.
   */
  assertFilePresent(file: Express.Multer.File | undefined): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
  }
}
