import type { Report } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { ReportAction } from '../dto/update-report-status.dto';
export declare class ReportsActionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    executeAction(report: Report, action: ReportAction, _notes?: string): Promise<void>;
}
