import { LeadsActionsService } from '../services/leads-actions.service';
export interface MasterAvailablePayload {
    masterId: string;
}
export declare class MasterAvailableListener {
    private readonly leadsActions;
    private readonly logger;
    constructor(leadsActions: LeadsActionsService);
    handleMasterAvailable(payload: MasterAvailablePayload): Promise<void>;
}
