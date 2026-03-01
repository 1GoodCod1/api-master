export declare enum IdeaStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    IMPLEMENTED = "IMPLEMENTED"
}
export declare class UpdateIdeaStatusDto {
    status: IdeaStatus;
    adminNote?: string;
}
