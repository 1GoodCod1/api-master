import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { unlink } from 'fs/promises';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit-action.enum';
import { AuditEntityType } from '../../audit/audit-entity-type.enum';

/**
 * GDPR: удаление файлов (фото документов, селфи) после одобрения верификации.
 * Факт верификации в БД сохраняется; файлы удаляются из хранилища сразу после approve
 * (и дублирующая очистка в cron на случай сбоя).
 */
@Injectable()
export class VerificationDocumentsPurgeService {
  private readonly logger = new Logger(VerificationDocumentsPurgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Удалить файлы верификации для одной заявки (после APPROVED).
   */
  async purgeVerificationFilesById(verificationId: string): Promise<void> {
    const v = await this.prisma.masterVerification.findUnique({
      where: { id: verificationId },
      include: {
        documentFront: true,
        documentBack: true,
        selfie: true,
        master: { select: { userId: true } },
      },
    });

    if (!v || v.documentsDeletedAt) return;
    if (v.status !== 'APPROVED') return;

    const hasFiles = v.documentFrontId || v.documentBackId || v.selfieId;
    if (!hasFiles) return;

    await this.purgeLoadedVerificationFiles(v, 'after_approve');
  }

  /**
   * Повторная очистка: APPROVED с ещё не удалёнными файлами (сбой при approve или старые записи).
   */
  async purgeRemainingApprovedVerificationFiles(): Promise<void> {
    const verifications = await this.prisma.masterVerification.findMany({
      where: {
        status: 'APPROVED',
        documentsDeletedAt: null,
        OR: [
          { documentFrontId: { not: null } },
          { documentBackId: { not: null } },
          { selfieId: { not: null } },
        ],
      },
      include: {
        documentFront: true,
        documentBack: true,
        selfie: true,
        master: { select: { userId: true } },
      },
    });

    if (verifications.length === 0) return;

    let deletedCount = 0;
    for (const v of verifications) {
      const n = await this.purgeLoadedVerificationFiles(v, 'batch_retry');
      deletedCount += n;
    }

    if (deletedCount > 0) {
      this.logger.log(
        `GDPR verification files: purged ${deletedCount} file record(s) from ${verifications.length} approved verification(s) (batch/retry)`,
      );
    }
  }

  private async purgeLoadedVerificationFiles(
    v: {
      id: string;
      masterId: string;
      master?: { userId: string } | null;
      documentFront: { id: string; path: string } | null;
      documentBack: { id: string; path: string } | null;
      selfie: { id: string; path: string } | null;
    },
    source: 'after_approve' | 'batch_retry',
  ): Promise<number> {
    const fileIds: string[] = [];
    const filePaths: string[] = [];

    for (const file of [v.documentFront, v.documentBack, v.selfie]) {
      if (file) {
        fileIds.push(file.id);
        filePaths.push(file.path);
      }
    }

    if (fileIds.length === 0) return 0;

    for (const path of filePaths) {
      await this.deleteFileFromStorage(path);
    }

    await this.prisma.masterVerification.update({
      where: { id: v.id },
      data: {
        documentFrontId: null,
        documentBackId: null,
        selfieId: null,
        documentsDeletedAt: new Date(),
      },
    });

    await this.prisma.file.deleteMany({
      where: { id: { in: fileIds } },
    });

    try {
      await this.auditService.log({
        userId: v.master?.userId ?? null,
        action: AuditAction.VERIFICATION_DOCUMENTS_PURGED,
        entityType: AuditEntityType.MasterVerification,
        entityId: v.id,
        newData: {
          masterId: v.masterId,
          fileCount: fileIds.length,
          source,
        } satisfies Prisma.InputJsonValue,
      });
    } catch (err) {
      this.logger.error('Audit log при удалении файлов верификации', err);
    }

    return fileIds.length;
  }

  private async deleteFileFromStorage(filePath: string): Promise<void> {
    try {
      if (filePath.startsWith('http')) {
        const url = new URL(filePath);
        const key = url.pathname.replace(/^\/[^/]+\//, '');
        const b2KeyId = this.configService.get<string>('b2.applicationKeyId');
        const b2Key = this.configService.get<string>('b2.applicationKey');
        const b2Bucket = this.configService.get<string>('b2.bucket');
        const b2Region = this.configService.get<string>(
          'b2.region',
          'eu-central-003',
        );

        if (b2KeyId && b2Key && b2Bucket) {
          const s3 = new S3Client({
            credentials: { accessKeyId: b2KeyId, secretAccessKey: b2Key },
            region: b2Region,
            endpoint: `https://s3.${b2Region}.backblazeb2.com`,
            forcePathStyle: true,
          });
          await s3.send(
            new DeleteObjectCommand({ Bucket: b2Bucket, Key: key }),
          );
        }
      } else {
        const localPath = filePath.startsWith('/') ? `.${filePath}` : filePath;
        await unlink(localPath).catch(() => {});
      }
    } catch (err) {
      this.logger.warn(
        `Failed to delete file from storage: ${filePath}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
