import { Module } from '@nestjs/common';
import { IdeasController } from './ideas.controller';
import { IdeasService } from './ideas.service';
import { IdeasQueryService } from './services/ideas-query.service';
import { IdeasActionsService } from './services/ideas-actions.service';
import { PrismaService } from '../shared/database/prisma.service';

@Module({
  controllers: [IdeasController],
  providers: [
    IdeasService,
    IdeasQueryService,
    IdeasActionsService,
    PrismaService,
  ],
  exports: [IdeasService],
})
export class IdeasModule {}
