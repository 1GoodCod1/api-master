import type { ReviewStatus } from '@prisma/client';

export interface FindReviewsOptions {
  status?: string;
  statusIn?: ReviewStatus[];
  limit?: string;
  cursor?: string;
  page?: string;
  sortOrder?: 'asc' | 'desc';
}
