import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards';
import type { RequestWithUser } from '../../../common/decorators';
import { ReferralsService } from './referrals.service';
import { ApplyReferralCodeDto } from './dto/apply-referral-code.dto';
import { CONTROLLER_PATH } from '../../../common/constants';

@ApiTags('Referrals')
@Controller(CONTROLLER_PATH.referrals)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('my')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 req/min (read-only, user data)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my referral code and stats' })
  async getMyReferralInfo(@Req() req: RequestWithUser) {
    return this.referralsService.getMyReferralInfo(req.user.id);
  }

  @Get('validate/:code')
  @ApiOperation({ summary: 'Validate a referral code (public)' })
  async validateCode(@Param('code') code: string) {
    return this.referralsService.validateCode(code);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply referral code (after registration)' })
  async applyCode(
    @Body() dto: ApplyReferralCodeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.referralsService.applyReferralCode(req.user.id, dto.code);
  }
}
