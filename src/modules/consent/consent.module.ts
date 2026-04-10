import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/database/prisma.module';
import { ConsentController } from './consent.controller';
import { ConsentService } from './services/consent.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
