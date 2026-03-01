import { PrismaService } from '../../shared/database/prisma.service';
import { CreatePortfolioItemDto, UpdatePortfolioItemDto, ReorderPortfolioDto } from '../dto/portfolio.dto';
export declare class PortfolioService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(masterId: string, serviceTag?: string): Promise<({
        beforeFile: {
            path: string;
            id: string;
            filename: string;
            mimetype: string;
        };
        afterFile: {
            path: string;
            id: string;
            filename: string;
            mimetype: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string | null;
        masterId: string;
        order: number;
        beforeFileId: string;
        afterFileId: string;
        serviceTags: string[];
    })[]>;
    findOne(id: string): Promise<{
        beforeFile: {
            path: string;
            id: string;
            filename: string;
            mimetype: string;
        };
        afterFile: {
            path: string;
            id: string;
            filename: string;
            mimetype: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string | null;
        masterId: string;
        order: number;
        beforeFileId: string;
        afterFileId: string;
        serviceTags: string[];
    }>;
    create(masterId: string, dto: CreatePortfolioItemDto): Promise<{
        beforeFile: {
            path: string;
            id: string;
            filename: string;
            mimetype: string;
        };
        afterFile: {
            path: string;
            id: string;
            filename: string;
            mimetype: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string | null;
        masterId: string;
        order: number;
        beforeFileId: string;
        afterFileId: string;
        serviceTags: string[];
    }>;
    update(itemId: string, masterId: string, dto: UpdatePortfolioItemDto): Promise<{
        beforeFile: {
            path: string;
            id: string;
            filename: string;
            mimetype: string;
        };
        afterFile: {
            path: string;
            id: string;
            filename: string;
            mimetype: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string | null;
        masterId: string;
        order: number;
        beforeFileId: string;
        afterFileId: string;
        serviceTags: string[];
    }>;
    remove(itemId: string, masterId: string): Promise<{
        deleted: boolean;
    }>;
    reorder(masterId: string, dto: ReorderPortfolioDto): Promise<({
        beforeFile: {
            path: string;
            id: string;
            filename: string;
            mimetype: string;
        };
        afterFile: {
            path: string;
            id: string;
            filename: string;
            mimetype: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string | null;
        masterId: string;
        order: number;
        beforeFileId: string;
        afterFileId: string;
        serviceTags: string[];
    })[]>;
    getServiceTags(masterId: string): Promise<string[]>;
}
