import { Injectable, Logger } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import { VerificationStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { SORT_ASC } from '../../shared/constants/sort-order.constants';
import { EncryptionService } from '../../shared/utils/encryption.service';

@Injectable()
export class VerificationQueryService {
  private readonly logger = new Logger(VerificationQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private async decryptDocumentNumber(
    docNumber: string | null,
  ): Promise<string | null> {
    if (!docNumber) return null;
    try {
      return await this.encryption.decrypt(docNumber);
    } catch {
      return docNumber;
    }
  }

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

    if (!user?.masterProfile) {
      throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
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
                  firstName: true,
                  lastName: true,
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
        orderBy: { submittedAt: SORT_ASC },
        skip,
        take: limit,
      }),
      this.prisma.masterVerification.count({
        where: { status: VerificationStatus.PENDING },
      }),
    ]);

    return {
      verifications: await Promise.all(
        verifications.map(async (v) => ({
          ...v,
          documentNumber: await this.decryptDocumentNumber(v.documentNumber),
        })),
      ),
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
                firstName: true,
                lastName: true,
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
      throw AppErrors.notFound(AppErrorMessages.VERIFICATION_REQUEST_NOT_FOUND);
    }

    return {
      ...verification,
      documentNumber: await this.decryptDocumentNumber(
        verification.documentNumber,
      ),
    };
  }

  /** Количество уже одобренных верификаций (для автовыдачи премиума первым 100) */
  async getApprovedCount(): Promise<number> {
    return this.prisma.masterVerification.count({
      where: { status: VerificationStatus.APPROVED },
    });
  }
}
