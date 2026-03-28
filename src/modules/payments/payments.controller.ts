import { UserRole } from '@prisma/client';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../common/errors';
import { timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { GetUser, Roles } from '../../common/decorators';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CONTROLLER_PATH } from '../../common/constants';

@ApiTags('Payments')
@Controller(CONTROLLER_PATH.payments)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== ПЛАТЕЖИ MIA ====================

  @Post('create-mia-checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
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
  @Roles(UserRole.MASTER)
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
    // --- Защита webhook ---
    // Конфигурируй URL каллбека в MIA дашборде:
    //   https://your-api.com/payments/mia-callback?token=<MIA_WEBHOOK_SECRET>
    const expectedSecret = this.configService.get<string>(
      'mia.webhookSecret',
      '',
    );
    const nodeEnv = this.configService.get<string>('nodeEnv', 'development');
    if (!expectedSecret) {
      if (nodeEnv === 'production') {
        // В production без секрета вебхук закрыт полностью
        throw AppErrors.forbidden(AppErrorMessages.WEBHOOK_NOT_CONFIGURED);
      }
      this.logger.warn(
        'MIA_WEBHOOK_SECRET is not set — mia-callback endpoint is UNPROTECTED! Set it in .env',
      );
    } else {
      // Сравнение за constant-time — защита от timing attacks
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
    return this.paymentsService.handleMiaCallback(orderId);
  }

  @Post('mia-sandbox-simulate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Sandbox: simulate MIA payment (only when MIA_SANDBOX=true). Call after create-mia-checkout.',
  })
  async miaSandboxSimulate(
    @Body() body: { paymentId: string },
    @GetUser() user: JwtUser,
  ) {
    if (!body?.paymentId)
      throw AppErrors.badRequest(AppErrorMessages.PAYMENT_ID_REQUIRED);
    return this.paymentsService.simulateMiaSandboxPayment(
      body.paymentId,
      user.id,
    );
  }

  // ==================== ЗАПРОСЫ И СТАТИСТИКА ====================

  @Get('master/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments for master' })
  async getPaymentsForMaster(
    @Param('masterId') masterId: string,
    @GetUser() user: JwtUser,
  ) {
    // Защита в глубину: IDOR на уровне контроллера (дублируется в сервисе)
    if (user.role !== UserRole.ADMIN && user.masterProfile?.id !== masterId) {
      throw AppErrors.forbidden(AppErrorMessages.PAYMENT_ACCESS_DENIED);
    }
    return this.paymentsService.getPaymentsForMaster(masterId, user);
  }

  @Get('stats/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment statistics' })
  async getPaymentStats(
    @Param('masterId') masterId: string,
    @GetUser() user: JwtUser,
  ) {
    // Защита в глубину: IDOR на уровне контроллера (дублируется в сервисе)
    if (user.role !== UserRole.ADMIN && user.masterProfile?.id !== masterId) {
      throw AppErrors.forbidden(AppErrorMessages.PAYMENT_ACCESS_DENIED);
    }
    return this.paymentsService.getPaymentStats(masterId, user);
  }

  @Get('my-payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments for authenticated master' })
  async getMyPayments(@GetUser() user: JwtUser) {
    const masterId = user.masterProfile?.id;
    if (!masterId)
      throw AppErrors.badRequest(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    return this.paymentsService.getPaymentsForMaster(masterId, user);
  }

  // ==================== АПГРЕЙДЫ ====================

  @Post('confirm-pending-upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm pending upgrade' })
  async confirmPendingUpgrade(@GetUser() user: JwtUser) {
    return this.paymentsService.confirmPendingUpgrade(user.id);
  }

  @Post('cancel-pending-upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel pending upgrade' })
  async cancelPendingUpgrade(@GetUser() user: JwtUser) {
    return this.paymentsService.cancelPendingUpgrade(user.id);
  }

  @Post('cancel-tariff-at-period-end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Cancel subscription at period end (stays active until tariffExpiresAt)',
  })
  async cancelTariffAtPeriodEnd(@GetUser() user: JwtUser) {
    return this.paymentsService.cancelTariffAtPeriodEnd(user.id);
  }
}
