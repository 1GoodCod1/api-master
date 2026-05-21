import { Injectable } from '@nestjs/common';
import { JobStatus, ReviewStatus, type Prisma } from '@prisma/client';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../shared/database/prisma.service';
import { ReviewsActionService } from '../../marketplace/reviews/services/reviews-action.service';
import { CreateJobReviewDto } from '../dto/create-job-review.dto';
import { CompaniesAccessService } from './companies-access.service';

const PUBLIC_REVIEW_INCLUDE = {
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  job: {
    select: {
      id: true,
      title: true,
    },
  },
} as const;

@Injectable()
export class CompaniesReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompaniesAccessService,
    private readonly reviewsAction: ReviewsActionService,
  ) {}

  createMasterReviewForJob(
    user: JwtUser,
    jobId: string,
    dto: CreateJobReviewDto,
  ) {
    return this.access.withMyCompanyContext(
      user,
      async ({ tx, membership, company }) => {
        this.access.assertCustomerWorkspace(company);
        this.access.assertCanCreateRequest(membership);

        const job = await tx.job.findFirst({
          where: { id: jobId, companyId: company.id },
          include: {
            selectedApplication: {
              select: { masterId: true },
            },
          },
        });
        if (!job) {
          throw AppErrors.notFound('Company request not found');
        }
        if (job.status !== JobStatus.CLOSED) {
          throw AppErrors.badRequest(
            'Reviews are available only for closed requests',
          );
        }
        if (!job.selectedApplication) {
          throw AppErrors.badRequest('Cannot review without a selected master');
        }

        const existing = await tx.review.findUnique({
          where: { jobId },
          select: { id: true },
        });
        if (existing) {
          throw AppErrors.badRequest(AppErrorMessages.REVIEW_ALREADY_MASTER);
        }

        const author = await tx.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        });
        if (!author?.phone) {
          throw AppErrors.badRequest(
            AppErrorMessages.REVIEW_USER_PHONE_MISSING,
          );
        }

        const displayName = [author.firstName, author.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

        const review = await tx.review.create({
          data: {
            masterId: job.selectedApplication.masterId,
            clientId: user.id,
            clientPhone: author.phone,
            clientName: displayName || null,
            jobId,
            companyId: company.id,
            rating: dto.rating,
            comment: dto.comment,
            status: ReviewStatus.PENDING,
          },
        });

        await this.reviewsAction.updateMasterRating(
          job.selectedApplication.masterId,
        );
        return review;
      },
    );
  }

  createCompanyReview(user: JwtUser, jobId: string, dto: CreateJobReviewDto) {
    return this.prisma.withRlsContext(
      { currentUserId: user.id, userRole: user.role },
      async (tx) => {
        const master = await tx.master.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        if (!master) {
          throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);
        }

        const job = await tx.job.findUnique({
          where: { id: jobId },
          select: {
            id: true,
            status: true,
            companyId: true,
            selectedApplication: {
              select: { masterId: true },
            },
          },
        });
        if (!job?.companyId) {
          throw AppErrors.notFound(AppErrorMessages.JOB_NOT_FOUND);
        }
        if (job.status !== JobStatus.CLOSED) {
          throw AppErrors.badRequest(
            'Reviews are available only for closed jobs',
          );
        }
        if (job.selectedApplication?.masterId !== master.id) {
          throw AppErrors.forbidden(AppErrorMessages.JOB_ACCESS_DENIED);
        }

        const existing = await tx.companyReview.findUnique({
          where: { jobId },
          select: { id: true },
        });
        if (existing) {
          throw AppErrors.badRequest(
            'You have already reviewed this company for this job',
          );
        }

        const review = await tx.companyReview.create({
          data: {
            companyId: job.companyId,
            jobId,
            authorUserId: user.id,
            rating: dto.rating,
            comment: dto.comment,
            status: ReviewStatus.VISIBLE,
          },
          include: PUBLIC_REVIEW_INCLUDE,
        });

        await this.updateCompanyRating(job.companyId, tx);
        return review;
      },
    );
  }

  listPublicCompanyReviews(slugOrId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    return this.prisma.withRlsContext({}, async (tx) => {
      const company = await tx.company.findFirst({
        where: {
          OR: [{ id: slugOrId }, { slug: slugOrId }],
          isPublished: true,
        },
        select: { id: true },
      });
      if (!company) {
        throw AppErrors.notFound('Company not found');
      }

      const where = {
        companyId: company.id,
        status: ReviewStatus.VISIBLE,
      };

      const [items, total] = await Promise.all([
        tx.companyReview.findMany({
          where,
          include: PUBLIC_REVIEW_INCLUDE,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.companyReview.count({ where }),
      ]);

      return { items, total, page, limit };
    });
  }

  getJobReviewStatus(user: JwtUser, jobId: string) {
    return this.access.withMyCompanyContext(user, async ({ tx, company }) => {
      const job = await tx.job.findFirst({
        where: { id: jobId, companyId: company.id },
        select: {
          id: true,
          status: true,
          selectedApplicationId: true,
        },
      });
      if (!job) {
        throw AppErrors.notFound('Company request not found');
      }

      const [masterReview, companyReview] = await Promise.all([
        tx.review.findUnique({
          where: { jobId },
          select: { id: true, status: true, rating: true },
        }),
        tx.companyReview.findUnique({
          where: { jobId },
          select: { id: true, status: true, rating: true },
        }),
      ]);

      return {
        jobStatus: job.status,
        canReviewMaster: job.status === JobStatus.CLOSED && !masterReview,
        canReviewCompany: job.status === JobStatus.CLOSED && !companyReview,
        masterReview,
        companyReview,
      };
    });
  }

  async updateCompanyRating(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    const reviews = await db.companyReview.findMany({
      where: { companyId, status: ReviewStatus.VISIBLE },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      await db.company.update({
        where: { id: companyId },
        data: { rating: 0, totalReviews: 0 },
      });
      return;
    }

    const avgRating =
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    await db.company.update({
      where: { id: companyId },
      data: {
        rating: avgRating,
        totalReviews: reviews.length,
      },
    });
  }
}
