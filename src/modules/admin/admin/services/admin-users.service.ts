import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import {
  buildCreatedAtIdCursorWhereDesc,
  decodeCreatedAtIdCursor,
  nextCursorFromLastCreatedAtId,
} from '../../../shared/pagination/createdAtIdCursor';

/**
 * Сервис для управления пользователями в админке
 */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getUsers(filters?: {
    role?: string;
    verified?: string | boolean;
    banned?: string | boolean;
    page?: number;
    limit?: number;
    cursor?: string;
  }) {
    const {
      role,
      verified,
      banned,
      page = 1,
      limit = 20,
      cursor,
    } = filters ?? {};

    let verifiedBoolean: boolean | undefined;
    if (verified !== undefined && verified !== null) {
      if (typeof verified === 'string') {
        verifiedBoolean = verified === 'true';
      } else {
        verifiedBoolean = verified;
      }
    }

    let bannedBoolean: boolean | undefined;
    if (banned !== undefined && banned !== null) {
      if (typeof banned === 'string') {
        bannedBoolean = banned === 'true';
      } else {
        bannedBoolean = banned;
      }
    }
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 20;

    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role as UserRole;
    if (verifiedBoolean !== undefined) where.isVerified = verifiedBoolean;
    if (bannedBoolean !== undefined) where.isBanned = bannedBoolean;

    const cursorDecoded = decodeCreatedAtIdCursor(cursor);
    const useCursor = Boolean(cursor && cursorDecoded);
    const whereWithCursor: Prisma.UserWhereInput = useCursor
      ? (buildCreatedAtIdCursorWhereDesc(
          where as Record<string, unknown>,
          cursorDecoded!,
        ) as Prisma.UserWhereInput)
      : where;

    const select = {
      id: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      isBanned: true,
      lastLoginAt: true,
      createdAt: true,
      avatarFile: {
        select: {
          id: true,
          path: true,
          filename: true,
        },
      },
      masterProfile: {
        select: {
          id: true,
          tariffType: true,
          tariffExpiresAt: true,
          views: true,
          rating: true,
          experienceYears: true,
          avatarFile: {
            select: {
              id: true,
              path: true,
              filename: true,
            },
          },
          category: { select: { name: true } },
          city: { select: { name: true } },
        },
      },
    } satisfies Prisma.UserSelect;

    const orderBy: Prisma.UserOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
      { id: 'desc' },
    ];

    const [rawUsers, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereWithCursor,
        select,
        orderBy,
        ...(useCursor
          ? { take: limitNumber + 1 }
          : { skip: (pageNumber - 1) * limitNumber, take: limitNumber }),
      }),
      this.prisma.user.count({ where }),
    ]);

    const users = useCursor ? rawUsers.slice(0, limitNumber) : rawUsers;
    const nextCursor =
      useCursor && rawUsers.length > limitNumber
        ? nextCursorFromLastCreatedAtId(users)
        : null;

    return {
      users,
      pagination: {
        total,
        page: useCursor ? 1 : page,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        nextCursor,
      },
    };
  }

  async updateUser(
    userId: string,
    data: {
      isVerified?: boolean;
      isBanned?: boolean;
      role?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (data.isVerified !== undefined) updateData.isVerified = data.isVerified;
    if (data.isBanned !== undefined) updateData.isBanned = data.isBanned;
    if (data.role !== undefined) {
      updateData.role = data.role as UserRole;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    if (Object.keys(updateData).length > 0) {
      await this.cache.del(this.cache.keys.userMasterProfile(userId));
      await this.cache.del(this.cache.keys.userProfile(userId));
    }
    return updated;
  }

  async getRecentUsers(limit: number = 10) {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
