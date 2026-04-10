import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import { VerificationStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { NotificationEventEmitter } from '../../notifications/events';
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
    private readonly notificationEvents: NotificationEventEmitter,
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

      if (!user) throw AppErrors.notFound(AppErrorMessages.USER_NOT_FOUND);
      if (user.role !== UserRole.MASTER)
        throw AppErrors.badRequest(AppErrorMessages.VERIFICATION_ONLY_MASTERS);
      if (!user.masterProfile)
        throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
      if (dto.phone !== user.phone)
        throw AppErrors.badRequest(
          AppErrorMessages.VERIFICATION_PHONE_MISMATCH,
        );

      // Проверяем, не подана ли уже заявка
      const existingVerification =
        await this.prisma.masterVerification.findUnique({
          where: { masterId: user.masterProfile.id },
        });

      if (existingVerification?.status === VerificationStatus.PENDING) {
        throw AppErrors.badRequest(
          AppErrorMessages.VERIFICATION_ALREADY_PENDING,
        );
      }

      // GDPR: проверка согласия на обработку данных документов
      const hasConsent = await this.consentService.hasConsent(
        userId,
        ConsentType.VERIFICATION_DATA_PROCESSING,
      );
      if (!hasConsent) {
        throw AppErrors.badRequest(
          AppErrorMessages.VERIFICATION_CONSENT_REQUIRED,
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
      this.notificationEvents.notifyNewVerificationRequest({
        verificationId: verification.id,
        masterId: user.masterProfile.id,
        masterName,
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
        this.logger.error('Audit log failed on verification submit', err);
      }

      return {
        message: 'Verification request submitted successfully',
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

      if (!verification)
        throw AppErrors.notFound(
          AppErrorMessages.VERIFICATION_REQUEST_NOT_FOUND,
        );
      if (verification.status !== VerificationStatus.PENDING)
        throw AppErrors.badRequest(
          AppErrorMessages.VERIFICATION_ALREADY_PROCESSED,
        );

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
        this.notificationEvents.notifyVerificationApproved(userId, {
          verificationId,
          masterId: verification.masterId,
          isFirst100: false,
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
        this.notificationEvents.notifyVerificationRejected(userId, {
          verificationId,
          masterId: verification.masterId,
          reason: dto.notes || undefined,
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
        this.logger.error('Audit log failed on verification review', err);
      }

      return {
        message:
          dto.decision === VerificationDecision.APPROVE
            ? 'Verification request approved successfully'
            : 'Verification request rejected successfully',
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
