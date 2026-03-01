export declare class CreatePortfolioItemDto {
    title?: string;
    description?: string;
    beforeFileId: string;
    afterFileId: string;
    serviceTags?: string[];
}
export declare class UpdatePortfolioItemDto {
    title?: string;
    description?: string;
    serviceTags?: string[];
    order?: number;
}
export declare class ReorderPortfolioDto {
    ids: string[];
}
