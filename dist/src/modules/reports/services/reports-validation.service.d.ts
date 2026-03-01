import { PrismaService } from '../../shared/database/prisma.service';
import { CreateReportDto } from '../dto/create-report.dto';
export declare class ReportsValidationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    validateReportCreation(clientId: string, dto: CreateReportDto): Promise<{
        finalLeadId: string;
    }>;
}
