import { PrismaService } from '../../shared/database/prisma.service';
import { QueryIdeasDto } from '../dto/query-ideas.dto';
export declare class IdeasQueryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(queryDto: QueryIdeasDto): Promise<{
        ideas: ({
            votes: {
                userId: string;
            }[];
            author: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
                role: import("@prisma/client").$Enums.UserRole;
                masterProfile: {
                    id: string;
                } | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            status: import("@prisma/client").$Enums.IdeaStatus;
            title: string;
            authorId: string;
            votesCount: number;
            approvedAt: Date | null;
            rejectedAt: Date | null;
            implementedAt: Date | null;
            adminNote: string | null;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<({
        votes: {
            createdAt: Date;
            userId: string;
        }[];
        author: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            masterProfile: {
                id: string;
            } | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        status: import("@prisma/client").$Enums.IdeaStatus;
        title: string;
        authorId: string;
        votesCount: number;
        approvedAt: Date | null;
        rejectedAt: Date | null;
        implementedAt: Date | null;
        adminNote: string | null;
    }) | null>;
    checkUserVoted(ideaId: string, userId: string): Promise<boolean>;
}
