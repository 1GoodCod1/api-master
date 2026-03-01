import { PrismaService } from '../shared/database/prisma.service';
import { CacheService } from '../shared/cache/cache.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { InAppNotificationService } from '../notifications/services/in-app-notification.service';
export declare class PromotionsService {
    private readonly prisma;
    private readonly cache;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, cache: CacheService, notifications: InAppNotificationService);
    private getFixedServiceTitles;
    private getServiceTitlesWithActivePromotion;
    private assertNoActivePromotionForService;
    private assertCanCreateOrUpdatePromotion;
    create(masterId: string, dto: CreatePromotionDto): Promise<{
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
    findMyPromotions(masterId: string): Promise<{
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
    update(id: string, masterId: string, dto: UpdatePromotionDto): Promise<{
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
    remove(id: string, masterId: string): Promise<{
        deleted: boolean;
    }>;
    findActivePromotions(limit?: number): Promise<({
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
    findActivePromotionsForMaster(masterId: string): Promise<{
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
    private invalidatePromotionCache;
}
