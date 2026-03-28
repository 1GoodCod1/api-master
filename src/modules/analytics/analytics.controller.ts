import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Plans } from '../../common/decorators/plans.decorator';
import { PlansGuard } from '../../common/guards/plans.guard';
import { UserRole } from '@prisma/client';
import { TariffType } from '../../common/constants';
import type { RequestWithUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('master/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics for master' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days (default: 7)',
  })
  async getMasterAnalytics(
    @Param('masterId') masterId: string,
    @Query('days') days = 7,
    @Req() req: RequestWithUser,
  ) {
    return this.analyticsService.getAnalyticsForUser(req.user, masterId, days);
  }

  @Get('business')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get business analytics (admin only)' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days (default: 30)',
  })
  async getBusinessAnalytics(@Query('days') days = 30) {
    return this.analyticsService.getBusinessAnalytics(days);
  }

  @Get('system')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get system analytics (admin only)' })
  async getSystemAnalytics() {
    return this.analyticsService.getSystemAnalytics();
  }

  @Get('my-analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get analytics for authenticated master (BASIC/VIP: 14 days, PREMIUM: 30 days)',
  })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getMyAnalytics(
    @Query('days') days: number | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.analyticsService.getMyAnalytics(req.user, days);
  }

  @Get('my-analytics/advanced')
  @UseGuards(JwtAuthGuard, RolesGuard, PlansGuard)
  @Roles(UserRole.MASTER)
  @Plans(TariffType.PREMIUM)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get advanced analytics for PREMIUM tariff (30 days max)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days (max 30)',
  })
  async getMyAdvancedAnalytics(
    @Query('days') days = 30,
    @Req() req: RequestWithUser,
  ) {
    return this.analyticsService.getMyAdvancedAnalytics(req.user, days);
  }
}
