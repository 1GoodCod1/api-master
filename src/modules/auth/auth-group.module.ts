import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { SecurityModule } from './security/security.module';
import { PhoneVerificationModule } from './phone-verification/phone-verification.module';

/**
 * Aggregate module for auth: login, registration, security, phone-verification.
 */
@Module({
  imports: [AuthModule, SecurityModule, PhoneVerificationModule],
})
export class AuthGroupModule {}
