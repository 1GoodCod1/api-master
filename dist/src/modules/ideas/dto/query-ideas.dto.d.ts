export declare enum IdeaStatusFilter {
    ALL = "ALL",
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    IMPLEMENTED = "IMPLEMENTED"
}
export declare enum IdeaSortBy {
    VOTES = "VOTES",
    CREATED_AT = "CREATED_AT",
    UPDATED_AT = "UPDATED_AT"
}
export declare class QueryIdeasDto {
    status?: IdeaStatusFilter;
    sortBy?: IdeaSortBy;
    page?: number;
    limit?: number;
}
