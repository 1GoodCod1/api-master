import { UserRole } from '@prisma/client';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsQueryService } from './services/payments-query.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { GetUser, Roles } from '../../common/decorators';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CONTROLLER_PATH } from '../../common/constants';
import { AppErrors, AppErrorMessages } from '../../common/errors';

@ApiTags('Payments Query')
@Controller(CONTROLLER_PATH.payments)
export class PaymentsQueryController {
  constructor(private readonly queryService: PaymentsQueryService) {}

  private validateMasterAccess(masterId: string, authUser: JwtUser) {
    if (authUser.role === UserRole.ADMIN) return;

    const ownMasterId = authUser.masterProfile?.id;
    if (!ownMasterId || ownMasterId !== masterId) {
      throw AppErrors.forbidden(AppErrorMessages.PAYMENT_ACCESS_DENIED);
    }
  }

  @Get('master/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments for master' })
  async getPaymentsForMaster(
    @Param('masterId') masterId: string,
    @GetUser() user: JwtUser,
  ) {
    this.validateMasterAccess(masterId, user);
    return this.queryService.getPaymentsForMaster(masterId);
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
    this.validateMasterAccess(masterId, user);
    return this.queryService.getPaymentStats(masterId);
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
    return this.queryService.getPaymentsForMaster(masterId);
  }
}
