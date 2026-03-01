import type { RequestWithUser } from '../../common/decorators/get-user.decorator';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
export declare class PromotionsController {
    private readonly promotionsService;
    constructor(promotionsService: PromotionsService);
    getActivePromotions(limit?: string): Promise<({
        master: {
            id: string;
            avatarFileId: string | null;
            user: {
                firstName: string | null;
                lastName: string | null;
            };
            slug: string | null;
            category: {
                name: string;
            };
            city: {
                name: string;
            };
            rating: number;
            totalReviews: number;
            photos: {
                file: {
                    path: string;
                };
            }[];
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        isActive: boolean;
        title: string;
        masterId: string;
        discount: number;
        serviceTitle: string | null;
        validFrom: Date;
        validUntil: Date;
    })[]>;
    getActivePromotionsForMaster(masterId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        isActive: boolean;
        title: string;
        masterId: string;
        discount: number;
        serviceTitle: string | null;
        validFrom: Date;
        validUntil: Date;
    }[]>;
    getMyPromotions(req: RequestWithUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        isActive: boolean;
        title: string;
        masterId: string;
        discount: number;
        serviceTitle: string | null;
        validFrom: Date;
        validUntil: Date;
    }[]>;
    create(dto: CreatePromotionDto, req: RequestWithUser): Promise<{
        master: {
            user: {
                firstName: string | null;
                lastName: string | null;
            };
            category: {
                name: string;
            };
            city: {
                name: string;
            };
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        isActive: boolean;
        title: string;
        masterId: string;
        discount: number;
        serviceTitle: string | null;
        validFrom: Date;
        validUntil: Date;
    }>;
    update(id: string, dto: UpdatePromotionDto, req: RequestWithUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        isActive: boolean;
        title: string;
        masterId: string;
        discount: number;
        serviceTitle: string | null;
        validFrom: Date;
        validUntil: Date;
    }>;
    remove(id: string, req: RequestWithUser): Promise<{
        deleted: boolean;
    }>;
}
