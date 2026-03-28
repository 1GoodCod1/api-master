import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { VerificationStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { InAppNotificationService } from '../../notifications/notifications/services/in-app-notification.service';
import { EncryptionService } from '../../shared/utils/encryption.service';
import { ConsentService } from '../../consent/services/consent.service';
import { ConsentType } from '../../consent/dto/grant-consent.dto';
import { SubmitVerificationDto } from '../dto/submit-verification.dto';
import {
  ReviewVerificationDto,
  VerificationDecision,
} from '../dto/review-verification.dto';
import { VerificationDocumentsPurgeService } from './verification-documents-purge.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit-action.enum';
import { AuditEntityType } from '../../audit/audit-entity-type.enum';
import { Prisma, UserRole } from '@prisma/client';

@Injectable()
export class VerificationActionService {
  private readonly logger = new Logger(VerificationActionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly inAppNotifications: InAppNotificationService,
    private readonly encryption: EncryptionService,
    private readonly consentService: ConsentService,
    private readonly verificationDocumentsPurge: VerificationDocumentsPurgeService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Подать заявку на верификацию
   */
  async submit(userId: string, dto: SubmitVerificationDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { masterProfile: true },
      });

      if (!user) throw new NotFoundException('Пользователь не найден');
      if (user.role !== UserRole.MASTER)
        throw new BadRequestException(
          'Только мастера могут подавать заявку на верификацию',
        );
      if (!user.masterProfile)
        throw new NotFoundException('Профиль мастера не найден');
      if (dto.phone !== user.phone)
        throw new BadRequestException(
          'Номер телефона должен совпадать с номером в профиле',
        );

      // Проверяем, не подана ли уже заявка
      const existingVerification =
        await this.prisma.masterVerification.findUnique({
          where: { masterId: user.masterProfile.id },
        });

      if (existingVerification?.status === VerificationStatus.PENDING) {
        throw new BadRequestException(
          'Заявка на верификацию уже подана и ожидает рассмотрения',
        );
      }

      // GDPR: verify user has granted consent for document data processing
      const hasConsent = await this.consentService.hasConsent(
        userId,
        ConsentType.VERIFICATION_DATA_PROCESSING,
      );
      if (!hasConsent) {
        throw new BadRequestException(
          'Необходимо дать согласие на обработку персональных данных перед подачей заявки',
        );
      }

      const encryptedDocNumber = await this.encryption.encrypt(
        dto.documentNumber,
      );

      const verification = await this.prisma.masterVerification.upsert({
        where: { masterId: user.masterProfile.id },
        create: {
          masterId: user.masterProfile.id,
          documentType: dto.documentType,
          documentNumber: encryptedDocNumber,
          documentFrontId: dto.documentFrontId,
          documentBackId: dto.documentBackId,
          selfieId: dto.selfieId,
          phone: dto.phone,
          phoneVerified: user.phoneVerified,
          status: VerificationStatus.PENDING,
        },
        update: {
          documentType: dto.documentType,
          documentNumber: encryptedDocNumber,
          documentFrontId: dto.documentFrontId,
          documentBackId: dto.documentBackId,
          selfieId: dto.selfieId,
          phone: dto.phone,
          phoneVerified: user.phoneVerified,
          status: VerificationStatus.PENDING,
          submittedAt: new Date(),
          reviewedBy: null,
          reviewedAt: null,
          notes: null,
        },
      });

      // Обновляем статус мастера
      await this.prisma.master.update({
        where: { id: user.masterProfile.id },
        data: {
          pendingVerification: true,
          verificationSubmittedAt: new Date(),
        },
      });

      // In-app уведомление админам о новой заявке на верификацию
      const masterName =
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
        user.phone;
      await this.inAppNotifications
        .notifyNewVerificationRequest({
          verificationId: verification.id,
          masterId: user.masterProfile.id,
          masterName,
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(
            `Failed to send in-app new verification notification: ${msg}`,
          );
        });

      try {
        await this.auditService.log({
          userId,
          action: AuditAction.VERIFICATION_SUBMITTED,
          entityType: AuditEntityType.MasterVerification,
          entityId: verification.id,
          newData: {
            masterId: user.masterProfile.id,
            documentType: dto.documentType,
          } satisfies Prisma.InputJsonValue,
        });
      } catch (err) {
        this.logger.error('Audit log при подаче заявки на верификацию', err);
      }

      return {
        message: 'Заявка на верификацию успешно отправлена',
        verificationId: verification.id,
      };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error('submit verification failed', err);
      throw err;
    }
  }

  /**
   * Проверить (одобрить/отклонить) заявку на верификацию
   */
  async review(
    verificationId: string,
    adminId: string,
    dto: ReviewVerificationDto,
  ) {
    try {
      const verification = await this.prisma.masterVerification.findUnique({
        where: { id: verificationId },
        include: { master: true },
      });

      if (!verification) throw new NotFoundException('Заявка не найдена');
      if (verification.status !== VerificationStatus.PENDING)
        throw new BadRequestException('Заявка уже была обработана');

      const status =
        dto.decision === VerificationDecision.APPROVE
          ? VerificationStatus.APPROVED
          : VerificationStatus.REJECTED;

      // Обновляем заявку
      await this.prisma.masterVerification.update({
        where: { id: verificationId },
        data: {
          status,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          notes: dto.notes || null,
        },
      });

      // Если одобрено — обновляем статус мастера и пользователя.
      // Тариф мастер выбирает сам 1 кликом после верификации (claim-free).
      if (dto.decision === VerificationDecision.APPROVE) {
        const userId = verification.master.userId;
        await this.prisma.$transaction([
          this.prisma.master.update({
            where: { id: verification.masterId },
            data: { pendingVerification: false },
          }),
          this.prisma.user.update({
            where: { id: userId },
            data: { isVerified: true },
          }),
        ]);
        await this.invalidateCache(userId);

        // In-app уведомление мастеру: верификация одобрена
        await this.inAppNotifications
          .notifyVerificationApproved(userId, {
            verificationId,
            masterId: verification.masterId,
            isFirst100: false,
          })
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(
              `Failed to send in-app verification approved: ${msg}`,
            );
          });

        await this.verificationDocumentsPurge
          .purgeVerificationFilesById(verificationId)
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(
              `Failed to purge verification document files after approval: ${msg}`,
            );
          });
      } else {
        // Если отклонено - сбрасываем флаг ожидания
        await this.prisma.master.update({
          where: { id: verification.masterId },
          data: { pendingVerification: false },
        });

        // In-app уведомление мастеру: верификация отклонена
        const userId = verification.master.userId;
        await this.inAppNotifications
          .notifyVerificationRejected(userId, {
            verificationId,
            masterId: verification.masterId,
            reason: dto.notes || undefined,
          })
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(
              `Failed to send in-app verification rejected: ${msg}`,
            );
          });
      }

      try {
        await this.auditService.log({
          userId: adminId,
          action: AuditAction.VERIFICATION_REVIEWED,
          entityType: AuditEntityType.MasterVerification,
          entityId: verificationId,
          newData: {
            decision: dto.decision,
            masterId: verification.masterId,
            status,
            hasNotes: Boolean(dto.notes?.trim()),
          } satisfies Prisma.InputJsonValue,
        });
      } catch (err) {
        this.logger.error('Audit log при рассмотрении верификации', err);
      }

      return {
        message: `Заявка ${dto.decision === VerificationDecision.APPROVE ? 'одобрена' : 'отклонена'} успешно`,
      };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error('review verification failed', err);
      throw err;
    }
  }

  private async invalidateCache(userId: string) {
    await this.cache.del(this.cache.keys.userMasterProfile(userId));
    await this.cache.del(this.cache.keys.userProfile(userId));
  }
}
