import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(isActive?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        icon: string | null;
        isActive: boolean;
        sortOrder: number;
    }[]>;
    findOne(id: string): Promise<{
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
    }>;
    getMasters(id: string, page?: string, limit?: string, cursor?: string): Promise<{
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
    create(createCategoryDto: CreateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        icon: string | null;
        isActive: boolean;
        sortOrder: number;
    }>;
    update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        icon: string | null;
        isActive: boolean;
        sortOrder: number;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        icon: string | null;
        isActive: boolean;
        sortOrder: number;
    }>;
    toggleActive(id: string, isActive?: boolean): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        icon: string | null;
        isActive: boolean;
        sortOrder: number;
    }>;
    getStatistics(): Promise<{
        id: string;
        name: string;
        mastersCount: number;
        isActive: boolean;
        avgRating: number;
        totalLeads: number;
    }[]>;
}
