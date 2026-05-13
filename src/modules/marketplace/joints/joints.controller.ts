import { UserRole } from '@prisma/client';
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JointsService } from './joints.service';
import { PurchaseJointsDto } from './dto/purchase-joints.dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { GetUser, Roles } from '../../../common/decorators';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { CONTROLLER_PATH } from '../../../common/constants';

@ApiTags('Joints')
@Controller(CONTROLLER_PATH.joints)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER)
@ApiBearerAuth()
export class JointsController {
  constructor(private readonly jointsService: JointsService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current joints balance' })
  getBalance(@GetUser() user: JwtUser) {
    return this.jointsService.getMyBalance(user);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get joints transaction history' })
  getTransactions(
    @GetUser() user: JwtUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jointsService.getTransactions(user, page, limit);
  }

  @Post('purchase')
  @ApiOperation({
    summary: 'Purchase joints (placeholder — integrates with payment)',
  })
  purchase(@Body() dto: PurchaseJointsDto, @GetUser() user: JwtUser) {
    return this.jointsService.purchaseJoints(user, dto.amount);
  }
}
