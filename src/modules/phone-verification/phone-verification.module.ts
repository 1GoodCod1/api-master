import { Module } from '@nestjs/common';
import { PhoneVerificationController } from './phone-verification.controller';
import { PhoneVerificationService } from './phone-verification.service';
import { PrismaModule } from '../shared/database/prisma.module';
import { EncryptionModule } from '../shared/encryption/encryption.module';

@Module({
  imports: [PrismaModule, EncryptionModule],
  controllers: [PhoneVerificationController],
  providers: [PhoneVerificationService],
  exports: [PhoneVerificationService],
})
export class PhoneVerificationModule {}
