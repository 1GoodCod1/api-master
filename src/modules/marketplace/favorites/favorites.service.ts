import { Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import { PrismaService } from '../../shared/database/prisma.service';
import { SORT_DESC } from '../../../common/constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityEvent } from '../../engagement/recommendations/events/activity.events';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Получить все избранное пользователя
   */
  async findAll(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        master: {
          include: {
            user: {
              select: {
                id: true,
                isVerified: true,
              },
            },
            city: true,
            category: true,
            avatarFile: true,
          },
        },
      },
      orderBy: { createdAt: SORT_DESC },
    });

    return favorites.map((fav) => ({
      id: fav.id,
      masterId: fav.masterId,
      createdAt: fav.createdAt,
      master: fav.master,
    }));
  }

  /**
   * Добавить в избранное
   */
  async create(userId: string, masterId: string) {
    // Проверяем, существует ли мастер
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
    });

    if (!master) {
      throw AppErrors.notFound(AppErrorMessages.MASTER_NOT_FOUND);
    }

    // Проверяем, не добавлен ли уже
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_masterId: {
          userId,
          masterId,
        },
      },
    });

    if (existing) {
      throw AppErrors.badRequest(AppErrorMessages.FAVORITE_ALREADY);
    }

    // Создаем избранное
    const favorite = await this.prisma.favorite.create({
      data: {
        userId,
        masterId,
      },
      include: {
        master: {
          include: {
            user: {
              select: {
                id: true,
                isVerified: true,
              },
            },
            city: true,
            category: true,
            avatarFile: true,
          },
        },
      },
    });

    // Излучаем событие активности для системы рекомендаций
    this.eventEmitter.emit(ActivityEvent.TRACKED, {
      userId,
      action: 'favorite',
      masterId,
      categoryId: favorite.master.categoryId,
      cityId: favorite.master.cityId,
    });

    return {
      id: favorite.id,
      masterId: favorite.masterId,
      createdAt: favorite.createdAt,
      master: favorite.master,
    };
  }

  /**
   * Удалить из избранного
   */
  async remove(userId: string, masterId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_masterId: {
          userId,
          masterId,
        },
      },
    });

    if (!favorite) {
      throw AppErrors.notFound(AppErrorMessages.FAVORITE_NOT_FOUND);
    }

    await this.prisma.favorite.delete({
      where: {
        userId_masterId: {
          userId,
          masterId,
        },
      },
    });

    return { success: true };
  }

  /**
   * Проверить, в избранном ли мастер
   */
  async check(userId: string, masterId: string): Promise<boolean> {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_masterId: {
          userId,
          masterId,
        },
      },
    });

    return !!favorite;
  }

  /**
   * Получить количество избранного у пользователя
   */
  async count(userId: string): Promise<number> {
    return this.prisma.favorite.count({
      where: { userId },
    });
  }
}
