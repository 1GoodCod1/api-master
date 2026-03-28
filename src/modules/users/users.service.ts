import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { UsersQueryService } from './services/users-query.service';
import { UsersManageService } from './services/users-manage.service';
import { UsersAvatarService } from './services/users-avatar.service';
import { UsersGdprService } from './services/users-gdpr.service';
import { type AppLocale } from '../../common/constants';
import { UpdateUserDto } from './dto/update-user.dto';
import { buildPersonalDataPdf } from './services/personal-data-pdf.builder';
import type { PersonalDataPdfData } from './types';

/**
 * UsersService — координатор модуля пользователей.
 * Управляет процессами получения данных и управления учетными записями через специализированные сервисы.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly queryService: UsersQueryService,
    private readonly manageService: UsersManageService,
    private readonly avatarService: UsersAvatarService,
    private readonly gdprService: UsersGdprService,
  ) {}

  /**
   * Получить количество пользователей по фильтрам
   */
  async count(filters: Prisma.UserWhereInput = {}) {
    return this.queryService.count(filters);
  }

  /**
   * Найти одного пользователя по ID
   */
  async findOne(id: string) {
    return this.queryService.findOne(id);
  }

  /**
   * Обновить данные пользователя
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.manageService.update(id, updateUserDto);
  }

  /**
   * Удалить пользователя
   */
  async remove(id: string) {
    return this.manageService.remove(id);
  }

  /**
   * Заблокировать/разблокировать пользователя
   */
  async toggleBan(id: string) {
    return this.manageService.toggleBan(id);
  }

  /**
   * Верифицировать/деверифицировать пользователя
   */
  async toggleVerify(id: string) {
    return this.manageService.toggleVerify(id);
  }

  /**
   * Установить аватар
   */
  async setAvatar(userId: string, fileId?: string) {
    return this.avatarService.setAvatar(userId, fileId);
  }

  /**
   * Получить общую статистику по пользователям
   */
  async getStatistics() {
    return this.queryService.getStatistics();
  }

  /**
   * Получить фотографии клиента
   */
  async getMyPhotos(userId: string) {
    return this.queryService.getMyPhotos(userId);
  }

  /**
   * Установить предпочитаемый язык для email-шаблонов
   */
  async setPreferredLanguage(
    userId: string,
    lang: AppLocale,
  ): Promise<{ preferredLanguage: string }> {
    await this.manageService.setPreferredLanguage(userId, lang);
    return { preferredLanguage: lang };
  }

  /**
   * Удалить фотографию клиента
   */
  async removeMyPhoto(userId: string, fileId: string) {
    return this.avatarService.removeMyPhoto(userId, fileId);
  }

  /**
   * GDPR: Самостоятельное удаление аккаунта
   */
  async removeSelf(userId: string) {
    return this.gdprService.removeSelf(userId);
  }

  /**
   * GDPR: Экспорт персональных данных в PDF
   */
  async exportPersonalDataPdf(
    userId: string,
    res: Response,
    locale: string = 'en',
  ): Promise<void> {
    const data: PersonalDataPdfData =
      await this.gdprService.getPersonalDataForPdf(userId);
    const filename = `my-data-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    buildPersonalDataPdf(doc, data, locale);
    doc.end();
  }
}
