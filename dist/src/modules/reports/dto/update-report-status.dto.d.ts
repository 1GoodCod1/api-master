export declare enum ReportStatus {
    PENDING = "PENDING",
    REVIEWED = "REVIEWED",
    RESOLVED = "RESOLVED",
    REJECTED = "REJECTED"
}
export declare enum ReportAction {
    BAN_CLIENT = "BAN_CLIENT",
    BAN_MASTER = "BAN_MASTER",
    BAN_IP = "BAN_IP",
    WARNING_CLIENT = "WARNING_CLIENT",
    WARNING_MASTER = "WARNING_MASTER",
    NO_ACTION = "NO_ACTION"
}
export declare class UpdateReportStatusDto {
    status: ReportStatus;
    action?: ReportAction;
    notes?: string;
}
