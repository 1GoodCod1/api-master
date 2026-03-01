import { IdeasQueryService } from './services/ideas-query.service';
import { IdeasActionsService } from './services/ideas-actions.service';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaStatusDto } from './dto/update-idea-status.dto';
import { QueryIdeasDto } from './dto/query-ideas.dto';
export declare class IdeasService {
    private readonly queryService;
    private readonly actionsService;
    constructor(queryService: IdeasQueryService, actionsService: IdeasActionsService);
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
    create(userId: string, createIdeaDto: CreateIdeaDto): Promise<{
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
    }>;
    updateStatus(ideaId: string, updateDto: UpdateIdeaStatusDto): Promise<{
        author: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: import("@prisma/client").$Enums.UserRole;
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
    }>;
    toggleVote(ideaId: string, userId: string): Promise<{
        voted: boolean;
    }>;
    checkUserVoted(ideaId: string, userId: string): Promise<boolean>;
    delete(ideaId: string, userId: string, userRole: string): Promise<{
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
    }>;
}
