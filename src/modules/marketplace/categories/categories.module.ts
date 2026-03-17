import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoriesQueryService } from './services/categories-query.service';
import { CategoriesActionService } from './services/categories-action.service';
import { PrismaModule } from '../../shared/database/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    CategoriesQueryService,
    CategoriesActionService,
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
