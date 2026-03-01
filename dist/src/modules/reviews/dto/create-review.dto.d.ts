import { ReviewCriteriaDto } from './review-criteria.dto';
export declare class CreateReviewDto {
    masterId: string;
    clientPhone?: string;
    clientName?: string;
    rating: number;
    comment?: string;
    criteria?: ReviewCriteriaDto[];
    fileIds?: string[];
}
