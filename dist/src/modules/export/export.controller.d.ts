import type { Response } from 'express';
import { ExportService } from './export.service';
import type { RequestWithUser } from '../../common/decorators/get-user.decorator';
export declare class ExportController {
    private readonly exportService;
    constructor(exportService: ExportService);
    exportLeadsCSV(masterId: string, req: RequestWithUser, res: Response): Promise<void>;
    exportLeadsExcel(masterId: string, req: RequestWithUser, res: Response): Promise<void>;
    exportAnalyticsPDF(masterId: string, req: RequestWithUser, res: Response): Promise<void>;
}
