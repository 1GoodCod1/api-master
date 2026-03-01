import { Injectable, NotFoundException } from '@nestjs/common';
import { VerificationStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class VerificationQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получить статус верификации для текущего мастера
   * @param userId ID пользователя
   */
  async getMyStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        masterProfile: {
          include: {
            verification: {
              include: {
                documentFront: true,
                documentBack: true,
                selfie: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.masterProfile) {
      throw new NotFoundException('Профиль мастера не найден');
    }

    return {
      isVerified: user.isVerified,
      pendingVerification: user.masterProfile.pendingVerification,
      verification: user.masterProfile.verification,
    };
  }

  /**
   * Получить список ожидающих заявок на верификацию (для админа)
   * @param page Номер страницы
   * @param limit Лимит на страницу
   */
  async getPendingRequests(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [verifications, total] = await Promise.all([
      this.prisma.masterVerification.findMany({
        where: { status: VerificationStatus.PENDING },
        include: {
          master: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  phone: true,
                  phoneVerified: true,
                },
              },
            },
          },
          documentFront: true,
          documentBack: true,
          selfie: true,
        },
        orderBy: { submittedAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.masterVerification.count({
        where: { status: VerificationStatus.PENDING },
      }),
    ]);

    return {
      verifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Получить полные детали заявки на верификацию
   * @param verificationId ID заявки
   */
  async getDetails(verificationId: string) {
    const verification = await this.prisma.masterVerification.findUnique({
      where: { id: verificationId },
      include: {
        master: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                phoneVerified: true,
                createdAt: true,
              },
            },
            city: true,
            category: true,
          },
        },
        documentFront: true,
        documentBack: true,
        selfie: true,
      },
    });

    if (!verification) {
      throw new NotFoundException('Заявка на верификацию не найдена');
    }

    return verification;
  }

  /** Количество уже одобренных верификаций (для автовыдачи премиума первым 100) */
  async getApprovedCount(): Promise<number> {
    return this.prisma.masterVerification.count({
      where: { status: VerificationStatus.APPROVED },
    });
  }
}
