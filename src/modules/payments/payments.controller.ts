import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) { }

  // ==================== MIA PAYMENTS ====================

  @Post('create-mia-checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create MIA QR payment for tariff' })
  async createMiaCheckout(
    @Body() createPaymentDto: CreatePaymentDto,
    @GetUser() user: JwtUser,
  ) {
    return this.paymentsService.createMiaCheckout(createPaymentDto, user.id);
  }

  @Post('create-checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create MIA QR payment for tariff (alias)' })
  async createCheckout(
    @Body() createPaymentDto: CreatePaymentDto,
    @GetUser() user: JwtUser,
  ) {
    return this.paymentsService.createMiaCheckout(createPaymentDto, user.id);
  }

  @Post('mia-callback')
  @ApiOperation({ summary: 'MIA payment callback (webhook)' })
  async miaCallback(
    @Body() body: { orderId?: string },
    @Query('token') token: string,
  ) {
    // --- Webhook protection ---
    // Конфигурируй URL каллбека в MIA дашборде:
    //   https://your-api.com/payments/mia-callback?token=<MIA_WEBHOOK_SECRET>
    const expectedSecret = this.configService.get<string>(
      'mia.webhookSecret',
      '',
    );
    if (expectedSecret) {
      if (token !== expectedSecret) {
        this.logger.warn(
          `Rejected MIA webhook call — invalid token. orderId: ${body?.orderId ?? 'none'}`,
        );
        throw new ForbiddenException('Invalid webhook token');
      }
    } else {
      // Секрет не задан — вебхук незащищён! Опасно в продакшне, допустимо в dev.
      this.logger.warn(
        'MIA_WEBHOOK_SECRET is not set — mia-callback endpoint is UNPROTECTED! Set it in .env',
      );
    }
    // --- End webhook protection ---

    const orderId = body?.orderId;
    if (!orderId) throw new BadRequestException('orderId required');
    return this.paymentsService.handleMiaCallback(orderId);
  }

  @Post('mia-sandbox-simulate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Sandbox: simulate MIA payment (only when MIA_SANDBOX=true). Call after create-mia-checkout.',
  })
  async miaSandboxSimulate(
    @Body() body: { paymentId: string },
    @GetUser() user: JwtUser,
  ) {
    if (!body?.paymentId) throw new BadRequestException('paymentId required');
    return this.paymentsService.simulateMiaSandboxPayment(
      body.paymentId,
      user.id,
    );
  }

  // ==================== QUERY & STATS ====================

  @Get('master/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments for master' })
  async getPaymentsForMaster(
    @Param('masterId') masterId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.paymentsService.getPaymentsForMaster(masterId, user);
  }

  @Get('stats/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment statistics' })
  async getPaymentStats(
    @Param('masterId') masterId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.paymentsService.getPaymentStats(masterId, user);
  }

  @Get('my-payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments for authenticated master' })
  async getMyPayments(@GetUser() user: JwtUser) {
    const masterId = user.masterProfile?.id;
    if (!masterId) throw new BadRequestException('Master profile not found');
    return this.paymentsService.getPaymentsForMaster(masterId, user);
  }

  // ==================== UPGRADES ====================

  @Post('confirm-pending-upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm pending upgrade' })
  async confirmPendingUpgrade(@GetUser() user: JwtUser) {
    return this.paymentsService.confirmPendingUpgrade(user.id);
  }

  @Post('cancel-pending-upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel pending upgrade' })
  async cancelPendingUpgrade(@GetUser() user: JwtUser) {
    return this.paymentsService.cancelPendingUpgrade(user.id);
  }

  @Post('cancel-tariff-at-period-end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Cancel subscription at period end (stays active until tariffExpiresAt)',
  })
  async cancelTariffAtPeriodEnd(@GetUser() user: JwtUser) {
    return this.paymentsService.cancelTariffAtPeriodEnd(user.id);
  }
}
