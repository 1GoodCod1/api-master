import { Injectable } from '@nestjs/common';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { FilesActionService } from './services/files-action.service';

/**
 * FilesService — фасад модуля файлов.
 * Делегирует загрузку в FilesActionService, парсит query-параметры.
 */
@Injectable()
export class FilesService {
  constructor(private readonly actionService: FilesActionService) {}

  async uploadFileForUser(file: Express.Multer.File, user: JwtUser) {
    return this.actionService.uploadFile(file, user.id);
  }

  async uploadManyForUser(
    files: Express.Multer.File[],
    user: JwtUser | null,
    forLead?: string,
  ) {
    const userId = user?.id ?? null;
    const skipClientGallery = this.parseForLead(forLead);
    return this.actionService.uploadMany(files, userId, {
      skipClientGallery,
    });
  }

  private parseForLead(forLead?: string): boolean {
    return forLead === 'true' || forLead === '1';
  }
}
