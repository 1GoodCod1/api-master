import { Module } from '@nestjs/common';
import { DigestService } from './digest.service';
import { DigestController } from './digest.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { AppSettingsModule } from '../app-settings/app-settings.module';

@Module({
  imports: [PrismaModule, AppSettingsModule],
  controllers: [DigestController],
  providers: [DigestService],
  exports: [DigestService],
})
export class DigestModule {}
