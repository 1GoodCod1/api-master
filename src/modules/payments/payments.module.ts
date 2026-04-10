import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsMiaController } from './payments-mia.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentsQueryController } from './payments-query.controller';
import { PaymentsUpgradeController } from './payments-upgrade.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { TariffsModule } from '../marketplace/tariffs/tariffs.module';
import { PaymentsMiaService } from './services/payments-mia.service';
import { PaymentsWebhookService } from './services/payments-webhook.service';
import { PaymentsQueryService } from './services/payments-query.service';
import { PaymentsUpgradeService } from './services/payments-upgrade.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    TariffsModule,
    AuditModule,
  ],
  controllers: [
    PaymentsMiaController,
    PaymentsWebhookController,
    PaymentsQueryController,
    PaymentsUpgradeController,
  ],
  providers: [
    PaymentsMiaService,
    PaymentsWebhookService,
    PaymentsQueryService,
    PaymentsUpgradeService,
  ],
  exports: [
    PaymentsMiaService,
    PaymentsWebhookService,
    PaymentsQueryService,
    PaymentsUpgradeService,
  ],
})
export class PaymentsModule {}
