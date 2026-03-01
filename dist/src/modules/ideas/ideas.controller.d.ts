import { IdeasService } from './ideas.service';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaStatusDto } from './dto/update-idea-status.dto';
import { QueryIdeasDto } from './dto/query-ideas.dto';
import type { RequestWithOptionalUser, RequestWithUser } from '../../common/decorators/get-user.decorator';
export declare class IdeasController {
    private readonly ideasService;
    constructor(ideasService: IdeasService);
    findAll(queryDto: QueryIdeasDto, req: RequestWithOptionalUser): Promise<{
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
    findOne(id: string, req: RequestWithOptionalUser): Promise<({
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
    }) | {
        hasVoted: boolean;
        votes?: {
            createdAt: Date;
            userId: string;
        }[] | undefined;
        author?: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            masterProfile: {
                id: string;
            } | null;
        } | undefined;
        id?: string | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        description?: string | undefined;
        status?: import("@prisma/client").$Enums.IdeaStatus | undefined;
        title?: string | undefined;
        authorId?: string | undefined;
        votesCount?: number | undefined;
        approvedAt?: Date | null | undefined;
        rejectedAt?: Date | null | undefined;
        implementedAt?: Date | null | undefined;
        adminNote?: string | null | undefined;
    } | null>;
    create(createIdeaDto: CreateIdeaDto, req: RequestWithUser): Promise<{
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
    updateStatus(id: string, updateDto: UpdateIdeaStatusDto): Promise<{
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
    toggleVote(id: string, req: RequestWithUser): Promise<{
        voted: boolean;
    }>;
    delete(id: string, req: RequestWithUser): Promise<{
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
