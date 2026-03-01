import { AvailabilityStatus } from '@prisma/client';
export declare class UpdateAvailabilityStatusDto {
    availabilityStatus: AvailabilityStatus;
    maxActiveLeads?: number;
}
