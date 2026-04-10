import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CONTROLLER_PATH } from '../../../common/constants';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { GetUser, Roles } from '../../../common/decorators';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { SubscribeToAvailabilityDto } from './dto/subscribe-to-availability.dto';
import { LeadsAvailabilitySubscriptionService } from './services/leads-availability-subscription.service';

@ApiTags('Leads Subscriptions')
@Controller(CONTROLLER_PATH.leads)
export class LeadsSubscriptionController {
  constructor(
    private readonly subscriptionService: LeadsAvailabilitySubscriptionService,
  ) {}

  @Get('availability-subscription/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if subscribed to master availability' })
  @ApiResponse({ status: 200, description: 'Returns subscription status' })
  async checkAvailabilitySubscription(
    @Param('masterId') masterId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.subscriptionService.checkSubscription(user.id, masterId);
  }

  @Post('subscribe-availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to master availability notifications' })
  @ApiResponse({ status: 201, description: 'Subscribed successfully' })
  async subscribeToAvailability(
    @Body() dto: SubscribeToAvailabilityDto,
    @GetUser() user: JwtUser,
  ) {
    return this.subscriptionService.subscribe(user.id, dto.masterId);
  }

  @Post('unsubscribe-availability/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unsubscribe from master availability notifications',
  })
  async unsubscribeFromAvailability(
    @Param('masterId') masterId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.subscriptionService.unsubscribe(user.id, masterId);
  }
}
