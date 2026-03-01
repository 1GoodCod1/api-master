import { PortfolioService } from './services/portfolio.service';
import { CreatePortfolioItemDto, UpdatePortfolioItemDto, ReorderPortfolioDto } from './dto/portfolio.dto';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
export declare class PortfolioController {
    private readonly portfolioService;
    constructor(portfolioService: PortfolioService);
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
    getServiceTags(masterId: string): Promise<string[]>;
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
    create(user: JwtUser, dto: CreatePortfolioItemDto): Promise<{
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
    update(id: string, user: JwtUser, dto: UpdatePortfolioItemDto): Promise<{
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
    reorder(user: JwtUser, dto: ReorderPortfolioDto): Promise<({
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
    remove(id: string, user: JwtUser): Promise<{
        deleted: boolean;
    }>;
}
