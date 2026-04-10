import { UserRole } from '@prisma/client';
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsMiaService } from './services/payments-mia.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { GetUser, Roles } from '../../common/decorators';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CONTROLLER_PATH } from '../../common/constants';
import { AppErrors, AppErrorMessages } from '../../common/errors';

@ApiTags('Payments MIA')
@Controller(CONTROLLER_PATH.payments)
export class PaymentsMiaController {
  constructor(private readonly miaService: PaymentsMiaService) {}

  @Post('create-mia-checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create MIA QR payment for tariff' })
  async createMiaCheckout(
    @Body() createPaymentDto: CreatePaymentDto,
    @GetUser() user: JwtUser,
  ) {
    return this.miaService.createTariffQrPayment(createPaymentDto, user.id);
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
    return this.miaService.createTariffQrPayment(createPaymentDto, user.id);
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
    return this.miaService.simulateSandboxPayment(body.paymentId, user.id);
  }
}
