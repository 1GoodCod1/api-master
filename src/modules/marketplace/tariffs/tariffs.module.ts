import { Module } from '@nestjs/common';
import { TariffsService } from './tariffs.service';
import { TariffsController } from './tariffs.controller';
import { PrismaModule } from '../../shared/database/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { AuditModule } from '../../audit/audit.module';

// Специализированные сервисы
import { TariffsQueryService } from './services/tariffs-query.service';
import { TariffsActionService } from './services/tariffs-action.service';

@Module({
  imports: [PrismaModule, CacheModule, AuditModule],
  controllers: [TariffsController],
  providers: [TariffsService, TariffsQueryService, TariffsActionService],
  exports: [TariffsService],
})
export class TariffsModule {}
