import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import type { UpdateMasterDto } from '../dto/update-master.dto';
import { LeadStatus, ReviewStatus } from '../../../../common/constants';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  SORT_ASC,
  SORT_DESC,
} from '../../../shared/constants/sort-order.constants';
import { CacheService } from '../../../shared/cache/cache.service';
import { sanitizePublicMaster } from '../../../../common/helpers/plans';
import { resolvePublicMasterAvatarPath } from '../../../../common/helpers/master-public-avatar';

interface CachedMaster {
  id: string;
  categoryId: string | null;
  cityId: string | null;
  [key: string]: unknown;
}

@Injectable()
export class MastersProfileService {
  private readonly logger = new Logger(MastersProfileService.name);

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
        ).catch((err) =>
          this.logger.error('Ошибка инкремента просмотров', err),
        );
      }
      return cachedResult;
    }

    // Если нет в кеше, получаем из БД
    let master = await this.prisma.master.findUnique({
      where: { slug: idOrSlug },
      include: {
        avatarFile: true,
        photos: {
          orderBy: [{ order: SORT_ASC }, { createdAt: SORT_DESC }],
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
          orderBy: { createdAt: SORT_DESC },
          take: 10,
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isVerified: true,
            avatarFile: { select: { path: true } },
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
    master ??= await this.prisma.master.findUnique({
      where: { id: idOrSlug },
      include: {
        avatarFile: true,
        photos: {
          orderBy: [{ order: SORT_ASC }, { createdAt: SORT_DESC }],
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
          orderBy: { createdAt: SORT_DESC },
          take: 10,
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isVerified: true,
            avatarFile: { select: { path: true } },
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

    if (!master) {
      throw new NotFoundException('Master not found');
    }

    // Response rate: % of leads that master responded to (IN_PROGRESS or CLOSED vs NEW)
    // Completed projects: only CLOSED leads (excludes SPAM, NEW, IN_PROGRESS)
    const [respondedCount, totalLeads, closedLeadsCount] = await Promise.all([
      this.prisma.lead.count({
        where: {
          masterId: master.id,
          status: { in: ['IN_PROGRESS', 'CLOSED'] },
        },
      }),
      this.prisma.lead.count({ where: { masterId: master.id } }),
      this.prisma.lead.count({
        where: { masterId: master.id, status: LeadStatus.CLOSED },
      }),
    ]);
    const responseRate =
      totalLeads > 0 ? Math.round((respondedCount / totalLeads) * 100) : 100;

    const sanitized = sanitizePublicMaster(master);
    const photos = (master.photos ?? []) as Array<{ file: { id: string } }>;
    const isVerified = (master.user as { isVerified?: boolean })?.isVerified;
    const result = {
      ...sanitized,
      avatarUrl: resolvePublicMasterAvatarPath(master),
      photos: photos.map((p) => p.file),
      responseRate,
      leadsCount: closedLeadsCount,
      ...(!isVerified && { services: [] }),
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
      ).catch((err) => this.logger.error('Ошибка инкремента просмотров', err));
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
          orderBy: { createdAt: SORT_DESC },
          take: 10,
        },
        analytics: {
          orderBy: { date: SORT_DESC },
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
    isVerified = true,
  ) {
    if (
      !isVerified &&
      updateDto.services !== undefined &&
      Array.isArray(updateDto.services)
    ) {
      throw new ForbiddenException(
        'Account verification required to add or update services. Please complete verification first.',
      );
    }

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
    // Формируем данные для обновления: только поля, существующие в модели Master.
    // Явно обрабатываем services для корректного сохранения (Prisma Json type).
    const data: Prisma.MasterUncheckedUpdateInput = {
      profileLastEditedAt: new Date(),
    };
    const allowedKeys = [
      'description',
      'cityId',
      'categoryId',
      'experienceYears',
      'latitude',
      'longitude',
      'telegramChatId',
      'whatsappPhone',
      'services', // JSONB — array of { title, priceType, price?, currency? }
    ] as const;
    for (const key of allowedKeys) {
      if (
        key in masterFields &&
        (masterFields as Record<string, unknown>)[key] !== undefined
      ) {
        (data as Record<string, unknown>)[key] = (
          masterFields as Record<string, unknown>
        )[key];
      }
    }

    const rawCityId = (data as Record<string, unknown>).cityId as
      | string
      | undefined;
    const rawCategoryId = (data as Record<string, unknown>).categoryId as
      | string
      | undefined;

    if (rawCityId && rawCityId !== '' && rawCityId !== master.cityId) {
      const cityExists = await this.prisma.city.findUnique({
        where: { id: rawCityId },
        select: { id: true },
      });
      if (!cityExists) {
        delete (data as Record<string, unknown>).cityId;
        this.logger.warn(
          `Master ${master.id}: city "${rawCityId}" not found, skipping cityId update`,
        );
      }
    }

    if (
      rawCategoryId &&
      rawCategoryId !== '' &&
      rawCategoryId !== master.categoryId
    ) {
      const categoryExists = await this.prisma.category.findUnique({
        where: { id: rawCategoryId },
        select: { id: true },
      });
      if (!categoryExists) {
        delete (data as Record<string, unknown>).categoryId;
        this.logger.warn(
          `Master ${master.id}: category "${rawCategoryId}" not found, skipping categoryId update`,
        );
      }
    }

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
        await import('../../../shared/utils/slug.js');
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

  /**
   * Update only services — dedicated endpoint to avoid issues with full profile update.
   */
  async updateServices(
    userId: string,
    services: Array<{
      title: string;
      priceType: string;
      price?: number;
      currency?: string;
    }>,
  ) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true, slug: true },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const updated = await this.prisma.master.update({
      where: { userId },
      data: { services: services as unknown as Prisma.InputJsonValue },
    });

    await this.invalidateMasterCache(master.id, master.slug, master.slug);
    return updated;
  }

  async invalidateMasterCache(
    masterId: string,
    oldSlug?: string | null,
    newSlug?: string | null,
  ) {
    await this.cache.invalidateMasterRelated(masterId, {
      old: oldSlug,
      new: newSlug,
    });
  }
}
