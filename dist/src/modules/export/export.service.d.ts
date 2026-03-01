import { PrismaService } from '../shared/database/prisma.service';
import { Response } from 'express';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
export declare class ExportService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    validateExportAccess(masterId: string, user: JwtUser): Promise<void>;
    exportLeadsToCSV(masterId: string, user: JwtUser, res: Response): Promise<void>;
    exportLeadsToExcel(masterId: string, user: JwtUser, res: Response): Promise<void>;
    exportAnalyticsToPDF(masterId: string, user: JwtUser, res: Response): Promise<void>;
}
