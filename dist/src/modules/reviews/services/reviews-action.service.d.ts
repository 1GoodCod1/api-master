import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { InAppNotificationService } from '../../notifications/services/in-app-notification.service';
import { CreateReviewDto } from '../dto/create-review.dto';
import { ReviewStatus } from '../../../common/constants';
export declare class ReviewsActionService {
    private readonly prisma;
    private readonly cache;
    private readonly inAppNotifications;
    private readonly logger;
    constructor(prisma: PrismaService, cache: CacheService, inAppNotifications: InAppNotificationService);
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
    updateStatus(id: string, status: ReviewStatus, moderatedBy?: string): Promise<{
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
    updateMasterRating(masterId: string): Promise<void>;
    private validateCriteria;
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
    private invalidateMasterCache;
}
