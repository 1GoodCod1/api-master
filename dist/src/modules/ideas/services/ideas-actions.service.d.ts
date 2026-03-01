import { PrismaService } from '../../shared/database/prisma.service';
import { CreateIdeaDto } from '../dto/create-idea.dto';
import { UpdateIdeaStatusDto } from '../dto/update-idea-status.dto';
export declare class IdeasActionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
