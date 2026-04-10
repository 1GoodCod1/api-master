import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  CONTROLLER_PATH,
  VIEWS_HISTORY_PERIOD,
  VIEWS_HISTORY_PERIODS,
  type ViewsHistoryPeriod,
} from '../../../common/constants';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { GetUser, Roles } from '../../../common/decorators';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { MastersLandingStatsService } from './services/masters-landing-stats.service';
import { MastersStatsService } from './services/masters-stats.service';
import { MastersProfileService } from './services/masters-profile.service';

@ApiTags('Masters Stats')
@Controller(CONTROLLER_PATH.masters)
export class MastersStatsController {
  constructor(
    private readonly landingStatsService: MastersLandingStatsService,
    private readonly statsService: MastersStatsService,
    private readonly profileService: MastersProfileService,
  ) {}

  @Get('landing-stats')
  @ApiOperation({ summary: 'Get landing page stats (public)' })
  async getLandingStats() {
    return this.landingStatsService.getLandingStats();
  }

  @Get('stats/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get master statistics' })
  async getStats(@GetUser() user: JwtUser) {
    const master = await this.profileService.getProfile(user.id);
    return this.statsService.getStats(master.id);
  }

  @Get('stats/me/views-history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile views history (past weeks or months)' })
  @ApiQuery({
    name: 'period',
    required: true,
    enum: [...VIEWS_HISTORY_PERIODS],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getViewsHistory(
    @GetUser() user: JwtUser,
    @Query('period') period: ViewsHistoryPeriod = VIEWS_HISTORY_PERIOD.WEEK,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 12,
  ) {
    const safePeriod =
      period === VIEWS_HISTORY_PERIOD.MONTH
        ? VIEWS_HISTORY_PERIOD.MONTH
        : VIEWS_HISTORY_PERIOD.WEEK;

    const master = await this.profileService.getProfile(user.id);
    return this.statsService.getViewsHistory(
      master.id,
      safePeriod,
      Math.min(Math.max(limit || 12, 1), 24),
    );
  }
}
