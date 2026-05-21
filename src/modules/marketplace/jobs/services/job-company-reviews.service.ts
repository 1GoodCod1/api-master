import { Injectable } from '@nestjs/common';
import { JobStatus, ReviewStatus } from '@prisma/client';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CreateJobReviewDto } from '../../../companies/dto/create-job-review.dto';

@Injectable()
export class JobCompanyReviewsService {
  constructor(private readonly prisma: PrismaService) {}

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
        });

        const visibleReviews = await tx.companyReview.findMany({
          where: { companyId: job.companyId, status: ReviewStatus.VISIBLE },
          select: { rating: true },
        });
        const avgRating =
          visibleReviews.reduce((sum, item) => sum + item.rating, 0) /
          visibleReviews.length;

        await tx.company.update({
          where: { id: job.companyId },
          data: {
            rating: avgRating,
            totalReviews: visibleReviews.length,
          },
        });

        return review;
      },
    );
  }
}
