import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/database/prisma.module';
import { ConsentController } from './consent.controller';
import { ConsentService } from './services/consent.service';
import { CONSENT_REPOSITORY } from './repositories/consent.repository';
import { PrismaConsentRepository } from './repositories/prisma-consent.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ConsentController],
  providers: [
    ConsentService,
    { provide: CONSENT_REPOSITORY, useClass: PrismaConsentRepository },
  ],
  exports: [ConsentService],
})
export class ConsentModule {}
