export declare enum VerificationDecision {
    APPROVE = "APPROVE",
    REJECT = "REJECT"
}
export declare class ReviewVerificationDto {
    decision: VerificationDecision;
    notes?: string;
}
