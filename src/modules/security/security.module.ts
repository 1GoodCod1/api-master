import { Module } from '@nestjs/common';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';
import { AuditModule } from '../audit/audit.module';

// Специализированные сервисы
import { SecuritySuspiciousService } from './services/security-suspicious.service';
import { SecurityBanService } from './services/security-ban.service';
import { SecurityAuthService } from './services/security-auth.service';

@Module({
  imports: [PrismaModule, RedisModule, AuditModule],
  controllers: [SecurityController],
  providers: [
    SecurityService,
    SecuritySuspiciousService,
    SecurityBanService,
    SecurityAuthService,
  ],
  exports: [SecurityService],
})
export class SecurityModule {}
