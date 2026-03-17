import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class RecommendationsTrackerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Отследить действие пользователя и сохранить в историю активности
   * @param data Данные активности (userId, action, masterId и т.д.)
   */
  async trackActivity(data: {
    userId?: string;
    sessionId?: string;
    action: string;
    masterId?: string;
    categoryId?: string;
    cityId?: string;
    searchQuery?: string;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.userActivity.create({
      data: {
        userId: data.userId,
        sessionId: data.sessionId,
        action: data.action,
        masterId: data.masterId,
        categoryId: data.categoryId,
        cityId: data.cityId,
        searchQuery: data.searchQuery,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }
}
