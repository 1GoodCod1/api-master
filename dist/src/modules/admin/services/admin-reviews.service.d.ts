import { PrismaService } from '../../shared/database/prisma.service';
export declare class AdminReviewsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getReviews(filters?: {
        status?: string;
        page?: number;
        limit?: number;
        cursor?: string;
    }): Promise<{
        reviews: ({
            master: {
                user: {
                    firstName: string | null;
                    lastName: string | null;
                };
            };
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
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            nextCursor: string | null;
        };
    }>;
    moderateReview(reviewId: string, status: string, _reason?: string): Promise<{
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
}
