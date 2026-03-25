import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../shared/database/prisma.module';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './services/compliance.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
