import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { CacheModule } from '../shared/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
