import { PrismaService } from '../../shared/database/prisma.service';
export declare class MastersAvailabilityService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    incrementActiveLeads(masterId: string): Promise<{
        id: string;
        availabilityStatus: import("@prisma/client").$Enums.AvailabilityStatus;
        maxActiveLeads: number;
        currentActiveLeads: number;
    }>;
    decrementActiveLeads(masterId: string): Promise<{
        id: string;
        availabilityStatus: import("@prisma/client").$Enums.AvailabilityStatus;
        maxActiveLeads: number;
        currentActiveLeads: number;
    } | null>;
    syncAvailabilityStatus(masterId: string): Promise<void>;
}
