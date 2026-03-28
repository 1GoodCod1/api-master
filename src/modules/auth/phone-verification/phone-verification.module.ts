import { Module } from '@nestjs/common';
import { PhoneVerificationController } from './phone-verification.controller';
import { PhoneVerificationService } from './phone-verification.service';
import { PrismaModule } from '../../shared/database/prisma.module';
import { EncryptionModule } from '../../shared/encryption/encryption.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { AuditModule } from '../../audit/audit.module';
import { PhoneVerificationValidationService } from './services/phone-verification-validation.service';
import { PhoneVerificationActionService } from './services/phone-verification-action.service';
import { PhoneVerificationQueryService } from './services/phone-verification-query.service';

@Module({
  imports: [PrismaModule, EncryptionModule, CacheModule, AuditModule],
  controllers: [PhoneVerificationController],
  providers: [
    PhoneVerificationService,
    PhoneVerificationValidationService,
    PhoneVerificationActionService,
    PhoneVerificationQueryService,
  ],
  exports: [PhoneVerificationService],
})
export class PhoneVerificationModule {}
