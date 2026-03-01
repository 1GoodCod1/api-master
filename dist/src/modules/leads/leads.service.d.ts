import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../shared/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InAppNotificationService } from '../notifications/services/in-app-notification.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadsValidationService } from './services/leads-validation.service';
import { LeadsSpamService } from './services/leads-spam.service';
import { LeadsAnalyticsService } from './services/leads-analytics.service';
import { LeadsQueryService } from './services/leads-query.service';
import { LeadsActionsService } from './services/leads-actions.service';
import { MastersAvailabilityService } from '../masters/services/masters-availability.service';
export declare class LeadsService {
    private readonly prisma;
    private readonly notificationsService;
    private readonly inAppNotifications;
    private readonly validationService;
    private readonly spamService;
    private readonly analyticsService;
    private readonly queryService;
    private readonly actionsService;
    private readonly availabilityService;
    constructor(prisma: PrismaService, notificationsService: NotificationsService, inAppNotifications: InAppNotificationService, validationService: LeadsValidationService, spamService: LeadsSpamService, analyticsService: LeadsAnalyticsService, queryService: LeadsQueryService, actionsService: LeadsActionsService, availabilityService: MastersAvailabilityService);
    create(createLeadDto: CreateLeadDto, authUser?: JwtUser, ipAddress?: string): Promise<{
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
    private checkPremiumPayment;
    findAll(authUser: JwtUser, options?: {
        status?: string;
        limit?: number;
        cursor?: string;
        page?: number;
    }): Promise<import("../shared/pagination/cursor-pagination").PaginatedResult<unknown>>;
    findOne(idOrEncoded: string, authUser: JwtUser): Promise<{
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
    updateStatus(leadId: string, authUser: JwtUser, updateDto: UpdateLeadStatusDto): Promise<{
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
    getStats(authUser: JwtUser): Promise<{
        total: number;
        byStatus: {
            newLeads: number;
            inProgress: number;
            closed: number;
            spam: number;
        };
    }>;
    subscribeToAvailability(clientId: string, masterId: string): Promise<{
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
    unsubscribeFromAvailability(clientId: string, masterId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getActiveLeadToMaster(clientId: string, masterId: string): Promise<{
        id: string;
        createdAt: Date;
        conversation: {
            id: string;
        } | null;
        message: string;
        status: import("@prisma/client").$Enums.LeadStatus;
    } | null>;
}
