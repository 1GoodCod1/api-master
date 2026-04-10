import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { ReportsValidationService } from './services/reports-validation.service';
import { ReportsActionService } from './services/reports-action.service';
import { ReportsQueryService } from './services/reports-query.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsValidationService,
    ReportsActionService,
    ReportsQueryService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
