import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import {
  getStartOfTodayInMoldova,
  getStartOfDaysAgoInMoldova,
} from '../../shared/utils/timezone.util';

@Injectable()
export class UsersQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получить количество пользователей по фильтрам
   * @param filters Фильтры (Prisma where)
   */
  async count(filters: Prisma.UserWhereInput = {}) {
    return this.prisma.user.count({ where: filters });
  }

  /**
   * Найти одного пользователя по ID со всеми связями
   * @param id ID пользователя
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        masterProfile: {
          include: {
            category: true,
            city: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- exclude password from response
    const { password, ...result } = user;
    return result;
  }

  /**
   * Получить общую статистику по пользователям для админ-панели
   */
  async getStatistics() {
    const [
      totalUsers,
      mastersCount,
      adminsCount,
      verifiedCount,
      bannedCount,
      todayRegistrations,
      weekRegistrations,
      monthRegistrations,
      activeToday,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.MASTER } }),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.user.count({ where: { isBanned: true } }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: getStartOfTodayInMoldova(),
          },
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: getStartOfDaysAgoInMoldova(7),
          },
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: getStartOfDaysAgoInMoldova(30),
          },
        },
      }),
      this.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: getStartOfTodayInMoldova(),
          },
        },
      }),
    ]);

    return {
      totalUsers,
      byRole: {
        masters: mastersCount,
        admins: adminsCount,
        guests: totalUsers - mastersCount - adminsCount,
      },
      byStatus: {
        verified: verifiedCount,
        banned: bannedCount,
      },
      registrations: {
        today: todayRegistrations,
        week: weekRegistrations,
        month: monthRegistrations,
      },
      activeToday,
    };
  }

  /**
   * Получить фотографии в профиле клиента
   * @param userId ID пользователя
   */
  async getMyPhotos(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, avatarFileId: true },
    });

    if (user?.role !== UserRole.CLIENT) {
      throw new NotFoundException('Client profile not found');
    }

    const rows = await this.prisma.clientPhoto.findMany({
      where: { userId: user.id },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      take: 10,
      include: { file: true },
    });

    return {
      avatarFileId: user.avatarFileId ?? null,
      items: rows.map((r) => r.file),
    };
  }
}
