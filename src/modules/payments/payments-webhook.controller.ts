import { Controller, Post, Body, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { PaymentsWebhookService } from './services/payments-webhook.service';
import { AppErrors, AppErrorMessages } from '../../common/errors';
import { CONTROLLER_PATH } from '../../common/constants';

@ApiTags('Payments Webhook')
@Controller(CONTROLLER_PATH.payments)
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private readonly webhookService: PaymentsWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post('mia-callback')
  @ApiOperation({ summary: 'MIA payment callback (webhook)' })
  async miaCallback(
    @Body() body: { orderId?: string },
    @Query('token') token: string,
  ) {
    // --- Защита webhook ---
    const expectedSecret = this.configService.get<string>(
      'mia.webhookSecret',
      '',
    );
    const nodeEnv = this.configService.get<string>('nodeEnv', 'development');
    if (!expectedSecret) {
      if (nodeEnv === 'production') {
        throw AppErrors.forbidden(AppErrorMessages.WEBHOOK_NOT_CONFIGURED);
      }
      this.logger.warn(
        'MIA_WEBHOOK_SECRET is not set — mia-callback endpoint is UNPROTECTED! Set it in .env',
      );
    } else {
      const tokenBuf = Buffer.from(token ?? '');
      const secretBuf = Buffer.from(expectedSecret);
      const valid =
        tokenBuf.length === secretBuf.length &&
        timingSafeEqual(tokenBuf, secretBuf);
      if (!valid) {
        this.logger.warn(
          `Rejected MIA webhook call — invalid token. orderId: ${body?.orderId ?? 'none'}`,
        );
        throw AppErrors.forbidden(AppErrorMessages.WEBHOOK_INVALID_TOKEN);
      }
    }
    // --- Конец защиты webhook ---

    const orderId = body?.orderId;
    if (!orderId)
      throw AppErrors.badRequest(AppErrorMessages.ORDER_ID_REQUIRED);
      
    await this.webhookService.completeMiaTariffPayment(orderId);
    return { received: true };
  }
}
