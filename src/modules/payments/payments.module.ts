import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../shared/database/prisma.module';
import { MastersModule } from '../marketplace/masters/masters.module';
import { TariffsModule } from '../marketplace/tariffs/tariffs.module';
import { PaymentsMiaService } from './services/payments-mia.service';
import { PaymentsWebhookService } from './services/payments-webhook.service';
import { PaymentsQueryService } from './services/payments-query.service';
import { PaymentsUpgradeService } from './services/payments-upgrade.service';
import { NotificationsModule } from '../notifications/notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    MastersModule,
    TariffsModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsMiaService,
    PaymentsWebhookService,
    PaymentsQueryService,
    PaymentsUpgradeService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
