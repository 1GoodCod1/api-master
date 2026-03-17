import { Module } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CitiesController } from './cities.controller';
import { CitiesQueryService } from './services/cities-query.service';
import { CitiesActionService } from './services/cities-action.service';
import { PrismaModule } from '../../shared/database/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [CitiesController],
  providers: [CitiesService, CitiesQueryService, CitiesActionService],
  exports: [CitiesService],
})
export class CitiesModule {}
