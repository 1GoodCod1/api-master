import { Module } from '@nestjs/common';
import { TariffsService } from './tariffs.service';
import { TariffsController } from './tariffs.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';

// Специализированные сервисы
import { TariffsQueryService } from './services/tariffs-query.service';
import { TariffsActionService } from './services/tariffs-action.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [TariffsController],
  providers: [TariffsService, TariffsQueryService, TariffsActionService],
  exports: [TariffsService],
})
export class TariffsModule {}
