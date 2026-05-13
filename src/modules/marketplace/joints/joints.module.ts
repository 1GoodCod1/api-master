import { Module } from '@nestjs/common';
import { JointsService } from './joints.service';
import { JointsController } from './joints.controller';
import { PrismaModule } from '../../shared/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JointsController],
  providers: [JointsService],
  exports: [JointsService],
})
export class JointsModule {}
