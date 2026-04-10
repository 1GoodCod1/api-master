import { UserRole } from '@prisma/client';
import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsUpgradeService } from './services/payments-upgrade.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { GetUser, Roles } from '../../common/decorators';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CONTROLLER_PATH } from '../../common/constants';

@ApiTags('Payments Upgrade')
@Controller(CONTROLLER_PATH.payments)
export class PaymentsUpgradeController {
  constructor(private readonly upgradeService: PaymentsUpgradeService) {}

  @Post('confirm-pending-upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm pending upgrade' })
  async confirmPendingUpgrade(@GetUser() user: JwtUser) {
    return this.upgradeService.confirmPendingUpgrade(user.id);
  }

  @Post('cancel-pending-upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel pending upgrade' })
  async cancelPendingUpgrade(@GetUser() user: JwtUser) {
    return this.upgradeService.cancelPendingUpgrade(user.id);
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
    return this.upgradeService.cancelTariffAtPeriodEnd(user.id);
  }
}
