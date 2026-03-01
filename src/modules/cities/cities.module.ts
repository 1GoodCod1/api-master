import { Module } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CitiesController } from './cities.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { CacheModule } from '../shared/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [CitiesController],
  providers: [CitiesService],
  exports: [CitiesService],
})
export class CitiesModule {}
