import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditLogWriterService } from './services/audit-log-writer.service';
import { AuditLogQueryService } from './services/audit-log-query.service';
import { PrismaModule } from '../shared/database/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [AuditController],
  providers: [AuditService, AuditLogWriterService, AuditLogQueryService],
  exports: [AuditService],
})
export class AuditModule {}
