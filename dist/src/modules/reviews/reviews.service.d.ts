import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ReviewsActionService } from './services/reviews-action.service';
import { ReviewsQueryService } from './services/reviews-query.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewStatus } from '@prisma/client';
export declare class ReviewsService {
    private readonly actionService;
    private readonly queryService;
    constructor(actionService: ReviewsActionService, queryService: ReviewsQueryService);
    create(createReviewDto: CreateReviewDto, clientId: string, authUser?: JwtUser | null): Promise<{
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
    findAllForMaster(masterId: string, options?: {
        status?: string;
        limit?: number;
        cursor?: string;
        page?: number;
        sortOrder?: 'asc' | 'desc';
    }): Promise<import("../shared/pagination/cursor-pagination").PaginatedResult<unknown>>;
    updateReviewStatus(id: string, status: ReviewStatus, moderatedBy?: string): Promise<{
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
    canCreateReview(masterId: string, clientId: string): Promise<{
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
    getStats(masterId: string): Promise<{
        total: number;
        byStatus: {
            visible: number;
            pending: number;
            hidden: number;
            reported: number;
        };
        ratingDistribution: Record<number, number>;
    }>;
    updateMasterRating(masterId: string): Promise<void>;
    replyToReview(reviewId: string, masterId: string, content: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        masterId: string;
        content: string;
        reviewId: string;
    }>;
    deleteReply(reviewId: string, masterId: string): Promise<{
        deleted: boolean;
    }>;
    voteHelpful(reviewId: string, userId: string): Promise<{
        votesCount: number;
        id: string;
        createdAt: Date;
        userId: string;
        reviewId: string;
    }>;
    removeVote(reviewId: string, userId: string): Promise<{
        deleted: boolean;
        votesCount: number;
    }>;
}
