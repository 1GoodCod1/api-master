import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersQueryService } from './services/users-query.service';
import { UsersManageService } from './services/users-manage.service';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * UsersService — координатор модуля пользователей.
 * Управляет процессами получения данных и управления учетными записями через специализированные сервисы.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly queryService: UsersQueryService,
    private readonly manageService: UsersManageService,
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
    return this.manageService.setAvatar(userId, fileId);
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
    lang: 'en' | 'ru' | 'ro',
  ): Promise<{ preferredLanguage: string }> {
    await this.manageService.setPreferredLanguage(userId, lang);
    return { preferredLanguage: lang };
  }

  /**
   * Удалить фотографию клиента
   */
  async removeMyPhoto(userId: string, fileId: string) {
    return this.manageService.removeMyPhoto(userId, fileId);
  }

  /**
   * GDPR: Самостоятельное удаление аккаунта
   */
  async removeSelf(userId: string) {
    return this.manageService.removeSelf(userId);
  }

  /**
   * GDPR: Экспорт персональных данных
   */
  async exportPersonalData(userId: string) {
    return this.manageService.exportPersonalData(userId);
  }
}
