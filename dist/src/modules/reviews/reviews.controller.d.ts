import type { RequestWithUser } from '../../common/decorators/get-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { CreateReviewReplyDto } from './dto/create-review-reply.dto';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    canCreate(masterId: string, req: RequestWithUser): Promise<{
        canCreate: boolean;
        alreadyReviewed: boolean;
        noClosedLead?: undefined;
    } | {
        canCreate: boolean;
        noClosedLead: boolean;
        alreadyReviewed?: undefined;
    } | {
        canCreate: boolean;
        alreadyReviewed?: undefined;
        noClosedLead?: undefined;
    }>;
    create(createReviewDto: CreateReviewDto, req: RequestWithUser): Promise<{
        reviewCriteria: {
            id: string;
            createdAt: Date;
            rating: number;
            criteria: string;
            reviewId: string;
        }[];
        reviewFiles: ({
            file: {
                path: string;
                id: string;
                filename: string;
                mimetype: string;
            };
        } & {
            id: string;
            createdAt: Date;
            fileId: string;
            reviewId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        status: import("@prisma/client").$Enums.ReviewStatus;
        clientName: string | null;
        clientPhone: string;
        comment: string | null;
        masterId: string;
        clientId: string | null;
        moderatedBy: string | null;
        moderatedAt: Date | null;
    }>;
    findAllForMaster(masterId: string, status?: string, limit?: string, cursor?: string, page?: string, sortOrder?: 'asc' | 'desc'): Promise<import("../shared/pagination/cursor-pagination").PaginatedResult<unknown>>;
    getStats(masterId: string, req: RequestWithUser): Promise<{
        total: number;
        byStatus: {
            visible: number;
            pending: number;
            hidden: number;
            reported: number;
        };
        ratingDistribution: Record<number, number>;
    }>;
    updateStatus(id: string, updateDto: UpdateReviewStatusDto, req: RequestWithUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        status: import("@prisma/client").$Enums.ReviewStatus;
        clientName: string | null;
        clientPhone: string;
        comment: string | null;
        masterId: string;
        clientId: string | null;
        moderatedBy: string | null;
        moderatedAt: Date | null;
    }>;
    getMyReviews(req: RequestWithUser, limit?: string, cursor?: string, page?: string): Promise<import("../shared/pagination/cursor-pagination").PaginatedResult<unknown>>;
    replyToReview(id: string, dto: CreateReviewReplyDto, req: RequestWithUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        masterId: string;
        content: string;
        reviewId: string;
    }>;
    deleteReply(id: string, req: RequestWithUser): Promise<{
        deleted: boolean;
    }>;
    voteHelpful(id: string, req: RequestWithUser): Promise<{
        votesCount: number;
        id: string;
        createdAt: Date;
        userId: string;
        reviewId: string;
    }>;
    removeVote(id: string, req: RequestWithUser): Promise<{
        deleted: boolean;
        votesCount: number;
    }>;
}
