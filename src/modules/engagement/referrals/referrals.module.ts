import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { PrismaModule } from '../../shared/database/prisma.module';
import { MastersModule } from '../../marketplace/masters/masters.module';
import { AppSettingsModule } from '../../app-settings/app-settings.module';

@Module({
  imports: [PrismaModule, MastersModule, AppSettingsModule],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
