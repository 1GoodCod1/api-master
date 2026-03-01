import { ReviewStatus } from '@prisma/client';
export declare class UpdateReviewStatusDto {
    status: ReviewStatus;
    moderationReason?: string;
}
