import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { CacheService } from '../shared/cache/cache.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from '@prisma/client';
export declare class CategoriesService {
    private readonly prisma;
    private readonly cache;
    private readonly logger;
    constructor(prisma: PrismaService, cache: CacheService);
    findAll(filters?: Prisma.CategoryWhereInput): Promise<Category[]>;
    findOne(id: string): Promise<Category & {
        _count: {
            masters: number;
        };
    }>;
    getMasters(categoryId: string, options?: {
        page?: number;
        limit?: number;
        cursor?: string;
    }): Promise<{
        category: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            description: string | null;
            icon: string | null;
            isActive: boolean;
            sortOrder: number;
        } & {
            _count: {
                masters: number;
            };
        };
        masters: {
            id: string;
            createdAt: Date;
        }[];
        meta: import("../shared/pagination/cursor-pagination").PaginationMeta;
    }>;
    create(dto: CreateCategoryDto): Promise<Category>;
    update(id: string, dto: UpdateCategoryDto): Promise<Category>;
    remove(id: string): Promise<Category>;
    getStatistics(): Promise<{
        id: string;
        name: string;
        mastersCount: number;
        isActive: boolean;
        avgRating: number;
        totalLeads: number;
    }[]>;
    private invalidateCategoryCache;
    private invalidateGlobalCaches;
}
