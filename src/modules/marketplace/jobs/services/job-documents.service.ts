import { Injectable } from '@nestjs/common';
import { JobDocumentKind, JobStatus } from '@prisma/client';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CreateJobDocumentDto } from '../dto/create-job-document.dto';
import { JobsAccessService } from './jobs-access.service';

const DOCUMENT_INCLUDE = {
  file: {
    select: {
      id: true,
      path: true,
      filename: true,
      mimetype: true,
      size: true,
    },
  },
  uploadedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

@Injectable()
export class JobDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsAccess: JobsAccessService,
  ) {}

  async listDocuments(jobId: string, user: JwtUser) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, clientId: true, companyId: true },
    });
    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);
    await this.jobsAccess.assertCanManageJobAsCustomer(user.id, job);

    return this.prisma.jobDocument.findMany({
      where: { jobId },
      include: DOCUMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async addDocument(jobId: string, dto: CreateJobDocumentDto, user: JwtUser) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, clientId: true, companyId: true, status: true },
    });
    if (!job) throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);
    await this.jobsAccess.assertCanManageJobAsCustomer(user.id, job);

    if (
      job.status !== JobStatus.FOUND &&
      job.status !== JobStatus.PENDING_CLOSE &&
      job.status !== JobStatus.CLOSED
    ) {
      throw AppErrors.badRequest(
        'Documents can be attached after a master is selected',
      );
    }

    const file = await this.prisma.file.findUnique({
      where: { id: dto.fileId },
      select: { id: true },
    });
    if (!file) {
      throw AppErrors.badRequest('File not found');
    }

    return this.prisma.jobDocument.create({
      data: {
        jobId,
        fileId: dto.fileId,
        kind: dto.kind ?? JobDocumentKind.OTHER,
        label: dto.label,
        uploadedByUserId: user.id,
      },
      include: DOCUMENT_INCLUDE,
    });
  }

  async deleteDocument(documentId: string, user: JwtUser) {
    const document = await this.prisma.jobDocument.findUnique({
      where: { id: documentId },
      include: {
        job: {
          select: { id: true, clientId: true, companyId: true },
        },
      },
    });
    if (!document) {
      throw AppErrors.notFound('Document not found');
    }

    const isUploader = document.uploadedByUserId === user.id;
    const canManageJob = await this.jobsAccess.canManageJobAsCustomer(
      user.id,
      document.job,
    );
    if (!isUploader && !canManageJob) {
      throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);
    }

    await this.prisma.jobDocument.delete({ where: { id: documentId } });
    return { success: true };
  }
}
