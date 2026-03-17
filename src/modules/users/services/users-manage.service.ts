import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersManageService {
  private readonly logger = new Logger(UsersManageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Обновить данные пользователя
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });

      if (!user) {
        throw new NotFoundException('Пользователь не найден');
      }

      return await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error('update failed', err);
      throw err;
    }
  }

  /**
   * Удалить пользователя
   */
  async remove(id: string) {
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (err) {
      this.logger.error('remove failed', err);
      throw err;
    }
  }

  /**
   * Переключить состояние блокировки пользователя
   */
  async toggleBan(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isBanned: !user.isBanned },
    });

    await this.invalidateCache(id);
    return updated;
  }

  /**
   * Переключить состояние верификации пользователя.
   * Сейчас при верификации только isVerified + pendingVerification.
   * ПОЗЖЕ ВАЖНО! Ниже закомментирована автовыдача Premium на 1 месяц — раскомментировать при включении.
   */
  async toggleVerify(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { masterProfile: { select: { id: true } } },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const newVerified = !user.isVerified;
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isVerified: newVerified },
    });

    if (newVerified && user.role === 'MASTER' && user.masterProfile) {
      await this.prisma.master.update({
        where: { id: user.masterProfile.id },
        data: { pendingVerification: false },
      });
    }

    await this.invalidateCache(id);
    return updated;
  }

  /**
   * Установить предпочитаемый язык для email-шаблонов
   */
  async setPreferredLanguage(
    userId: string,
    lang: 'en' | 'ru' | 'ro',
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferredLanguage: lang },
    });
  }

  private async invalidateCache(userId: string) {
    await this.cache.del(this.cache.keys.userMasterProfile(userId));
    await this.cache.del(this.cache.keys.userProfile(userId));
  }
}
