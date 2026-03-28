import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_DESC } from '../../../shared/constants/sort-order.constants';

/**
 * Сервис для управления аудитом и логами активности в админке
 */
@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecentActivity(limit: number = 20) {
    return this.prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: SORT_DESC },
      take: limit,
    });
  }
}
