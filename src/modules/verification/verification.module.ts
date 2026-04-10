import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';
import { PhoneVerificationModule } from '../auth/phone-verification/phone-verification.module';
import { EncryptionModule } from '../shared/encryption/encryption.module';
import { ConsentModule } from '../consent/consent.module';
import { AuditModule } from '../audit/audit.module';
import { FilesModule } from '../infrastructure/files/files.module';
import { VerificationQueryService } from './services/verification-query.service';
import { VerificationActionService } from './services/verification-action.service';
import { VerificationDocumentsPurgeService } from './services/verification-documents-purge.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    PhoneVerificationModule,
    EncryptionModule,
    ConsentModule,
    AuditModule,
    FilesModule,
  ],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    VerificationQueryService,
    VerificationActionService,
    VerificationDocumentsPurgeService,
  ],
  exports: [VerificationService, VerificationDocumentsPurgeService],
})
export class VerificationModule {}
