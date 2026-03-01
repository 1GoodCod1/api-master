import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { SubscribeToAvailabilityDto } from './dto/subscribe-to-availability.dto';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import type { RequestWithUser } from '../../common/decorators/get-user.decorator';
export declare class LeadsController {
    private readonly leadsService;
    constructor(leadsService: LeadsService);
    create(createLeadDto: CreateLeadDto, user: JwtUser, req: RequestWithUser): Promise<{
        files: ({
            file: {
                path: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                filename: string;
                mimetype: string;
                size: number;
                uploadedById: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            fileId: string;
            leadId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        status: import("@prisma/client").$Enums.LeadStatus;
        clientName: string | null;
        clientPhone: string;
        masterId: string;
        clientId: string | null;
        spamScore: number;
        isPremium: boolean;
    }>;
    getStats(user: JwtUser): Promise<{
        total: number;
        byStatus: {
            newLeads: number;
            inProgress: number;
            closed: number;
            spam: number;
        };
    }>;
    findAll(user: JwtUser, status?: string, limit?: string, cursor?: string, page?: string): Promise<import("../shared/pagination/cursor-pagination").PaginatedResult<unknown>>;
    updateStatus(id: string, updateDto: UpdateLeadStatusDto, user: JwtUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        status: import("@prisma/client").$Enums.LeadStatus;
        clientName: string | null;
        clientPhone: string;
        masterId: string;
        clientId: string | null;
        spamScore: number;
        isPremium: boolean;
    }>;
    findOne(idOrEncoded: string, user: JwtUser): Promise<{
        master: {
            id: string;
            user: {
                firstName: string | null;
                lastName: string | null;
            };
            slug: string | null;
            category: {
                id: string;
                name: string;
            };
            city: {
                id: string;
                name: string;
            };
        };
        client: {
            firstName: string | null;
            lastName: string | null;
        } | null;
        files: ({
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
            leadId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        status: import("@prisma/client").$Enums.LeadStatus;
        clientName: string | null;
        clientPhone: string;
        masterId: string;
        clientId: string | null;
        spamScore: number;
        isPremium: boolean;
    }>;
    getActiveLeadToMaster(masterId: string, user: JwtUser): Promise<{
        id: string;
        createdAt: Date;
        conversation: {
            id: string;
        } | null;
        message: string;
        status: import("@prisma/client").$Enums.LeadStatus;
    } | null>;
    subscribeToAvailability(dto: SubscribeToAvailabilityDto, user: JwtUser): Promise<{
        success: boolean;
        message: string;
        subscription: {
            id: string;
            createdAt: Date;
            masterId: string;
            clientId: string;
            notifiedAt: Date | null;
        };
    }>;
    unsubscribeFromAvailability(masterId: string, user: JwtUser): Promise<{
        success: boolean;
        message: string;
    }>;
}
