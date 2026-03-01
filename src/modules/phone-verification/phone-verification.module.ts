import { Module } from '@nestjs/common';
import { PhoneVerificationController } from './phone-verification.controller';
import { PhoneVerificationService } from './phone-verification.service';
import { PrismaModule } from '../shared/database/prisma.module';
import { EncryptionService } from '../shared/utils/encryption.service';

@Module({
  imports: [PrismaModule],
  controllers: [PhoneVerificationController],
  providers: [PhoneVerificationService, EncryptionService],
  exports: [PhoneVerificationService],
})
export class PhoneVerificationModule {}
