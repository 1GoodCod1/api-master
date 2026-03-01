import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { UpdateMasterDto } from '../dto/update-master.dto';
import { ReviewStatus } from '../../../common/constants';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { sanitizePublicMaster } from '../../../common/helpers/plans';

interface CachedMaster {
  id: string;
  categoryId: string | null;
  cityId: string | null;
  [key: string]: unknown;
}

@Injectable()
export class MastersProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findOne(
    idOrSlug: string,
    incrementViews = false,
    userId?: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string,
    categoryId?: string,
    cityId?: string,
    onViewIncrement?: (
      masterId: string,
      userId?: string,
      sessionId?: string,
      ipAddress?: string,
      userAgent?: string,
      categoryId?: string,
      cityId?: string,
    ) => Promise<void>,
  ) {
    // Строим ключ кеша
    const cacheKey = this.cache.keys.masterFull(idOrSlug);

    // Пытаемся получить из кеша
    const cachedResult = await this.cache.get<CachedMaster>(cacheKey);
    if (cachedResult) {
      // Если есть кеш, инкрементируем просмотры асинхронно (не блокируем ответ)
      if (incrementViews && onViewIncrement) {
        onViewIncrement(
          cachedResult.id,
          userId,
          sessionId,
          ipAddress,
          userAgent,
          cachedResult.categoryId ?? undefined,
          cachedResult.cityId ?? undefined,
        ).catch((err) => console.error('Failed to increment views', err));
      }
      return cachedResult;
    }

    // Если нет в кеше, получаем из БД
    let master = await this.prisma.master.findUnique({
      where: { slug: idOrSlug },
      include: {
        avatarFile: true,
        photos: {
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
          take: 15,
          include: {
            file: {
              select: {
                id: true,
                path: true,
                mimetype: true,
                size: true,
                filename: true,
                createdAt: true,
              },
            },
          },
        },
        category: true,
        city: true,
        reviews: {
          where: { status: ReviewStatus.VISIBLE },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            reviews: {
              where: { status: ReviewStatus.VISIBLE },
            },
            leads: true,
          },
        },
      },
    });

    // Если не найдено по slug, пробуем по id
    if (!master) {
      master = await this.prisma.master.findUnique({
        where: { id: idOrSlug },
        include: {
          avatarFile: true,
          photos: {
            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
            take: 15,
            include: {
              file: {
                select: {
                  id: true,
                  path: true,
                  mimetype: true,
                  size: true,
                  filename: true,
                  createdAt: true,
                },
              },
            },
          },
          category: true,
          city: true,
          reviews: {
            where: { status: ReviewStatus.VISIBLE },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              isVerified: true,
            },
          },
          _count: {
            select: {
              reviews: {
                where: { status: ReviewStatus.VISIBLE },
              },
              leads: true,
            },
          },
        },
      });
    }

    if (!master) {
      throw new NotFoundException('Master not found');
    }

    const sanitized = sanitizePublicMaster(master);
    const photos = (master.photos ?? []) as Array<{ file: { id: string } }>;
    const avatarFile = master.avatarFile as
      | { path?: string }
      | null
      | undefined;
    const result = {
      ...sanitized,
      avatarUrl: avatarFile?.path ?? null,
      photos: photos.map((p) => p.file),
    };

    // Сохраняем в кеш (используем оба ключа: по id и по slug если они разные)
    await this.cache.set(cacheKey, result, this.cache.ttl.masterProfile);
    if (master.slug && master.slug !== idOrSlug) {
      await this.cache.set(
        this.cache.keys.masterFull(master.id),
        result,
        this.cache.ttl.masterProfile,
      );
    }
    if (master.slug && idOrSlug !== master.slug) {
      await this.cache.set(
        this.cache.keys.masterFull(master.slug),
        result,
        this.cache.ttl.masterProfile,
      );
    }

    if (incrementViews && onViewIncrement) {
      // Обновляем счетчик просмотров асинхронно
      onViewIncrement(
        master.id,
        userId,
        sessionId,
        ipAddress,
        userAgent,
        master.categoryId,
        master.cityId,
      ).catch((err) => console.error('Failed to increment views', err));
    }

    return result;
  }

  async getProfile(userId: string) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        category: true,
        city: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        analytics: {
          orderBy: { date: 'desc' },
          take: 7,
        },
      },
    });

    if (!master) {
      throw new NotFoundException('Master profile not found');
    }

    return master;
  }

  private readonly PROFILE_EDIT_COOLDOWN_DAYS = 15;

  async updateProfile(
    userId: string,
    updateDto: UpdateMasterDto & { firstName?: string; lastName?: string },
  ) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!master) throw new NotFoundException('Master not found');

    if (master.profileLastEditedAt) {
      const daysSince = Math.floor(
        (Date.now() - master.profileLastEditedAt.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysSince < this.PROFILE_EDIT_COOLDOWN_DAYS) {
        const daysLeft = this.PROFILE_EDIT_COOLDOWN_DAYS - daysSince;
        throw new ForbiddenException(
          `Profile can be edited once every ${this.PROFILE_EDIT_COOLDOWN_DAYS} days. Try again in ${daysLeft} days.`,
        );
      }
    }

    const oldSlug = master.slug;
    const { firstName, lastName, ...masterFields } = updateDto;
    const data: Prisma.MasterUncheckedUpdateInput = {
      ...(masterFields as Prisma.MasterUncheckedUpdateInput),
      profileLastEditedAt: new Date(),
    };

    // Если обновляется имя, обновляем User и генерируем новый slug
    if (firstName || lastName) {
      const userUpdateData: { firstName?: string; lastName?: string } = {};
      if (firstName) userUpdateData.firstName = firstName;
      if (lastName) userUpdateData.lastName = lastName;

      await this.prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });

      const { generateUniqueSlugWithDb } =
        await import('../../shared/utils/slug.js');
      const newFirstName = firstName ?? master.user.firstName ?? '';
      const newLastName = lastName ?? master.user.lastName ?? '';
      const fullName = `${newFirstName} ${newLastName}`.trim();

      data.slug = await generateUniqueSlugWithDb(fullName, async (prefix) => {
        const rows = await this.prisma.master.findMany({
          where: { slug: { startsWith: prefix }, id: { not: master.id } },
          select: { slug: true },
        });
        return rows.map((m) => m.slug).filter((s): s is string => s != null);
      });
    }

    const updated = await this.prisma.master.update({
      where: { userId },
      data,
    });

    // Инвалидируем кеш
    await this.invalidateMasterCache(master.id, oldSlug, updated.slug);

    return updated;
  }

  async invalidateMasterCache(
    masterId: string,
    oldSlug?: string | null,
    newSlug?: string | null,
  ) {
    // Инвалидируем профиль мастера
    await this.cache.del(this.cache.keys.masterFull(masterId));
    if (oldSlug) await this.cache.del(this.cache.keys.masterFull(oldSlug));
    if (newSlug && newSlug !== oldSlug)
      await this.cache.del(this.cache.keys.masterFull(newSlug));

    // Инвалидируем статистику
    await this.cache.del(this.cache.keys.masterStats(masterId));

    // Инвалидируем все кеши мастера
    await this.cache.invalidate(`cache:master:${masterId}:*`);

    // Инвалидируем поиск, топ, популярных и новых мастеров (так как данные изменились)
    await this.cache.invalidate('cache:search:masters:*');
    await this.cache.invalidate('cache:masters:top:*');
    await this.cache.invalidate('cache:masters:popular:*');
    await this.cache.invalidate('cache:masters:new:*');
    // Инвалидируем фильтры поиска (так как количество мастеров может измениться)
    await this.cache.del(this.cache.keys.searchFilters());
  }
}
