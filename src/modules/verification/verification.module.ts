import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';
import { PhoneVerificationModule } from '../phone-verification/phone-verification.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EncryptionModule } from '../shared/encryption/encryption.module';

import { VerificationQueryService } from './services/verification-query.service';
import { VerificationActionService } from './services/verification-action.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    PhoneVerificationModule,
    NotificationsModule,
    EncryptionModule,
  ],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    VerificationQueryService,
    VerificationActionService,
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
