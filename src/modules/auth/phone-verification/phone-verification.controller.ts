import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PhoneVerificationService } from './phone-verification.service';
import { JwtAuthGuard } from '../../../common/guards';
import { GetUser } from '../../../common/decorators';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { CONTROLLER_PATH } from '../../../common/constants';

@ApiTags('Phone Verification')
@Controller(CONTROLLER_PATH.phoneVerification)
export class PhoneVerificationController {
  constructor(
    private readonly phoneVerificationService: PhoneVerificationService,
  ) {}

  @Post('send-code')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send verification code to user phone' })
  @ApiResponse({
    status: 200,
    description: 'Verification code sent successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async sendCode(@GetUser() user: JwtUser) {
    return this.phoneVerificationService.sendVerificationCodeForUser(user);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify phone with code' })
  @ApiResponse({ status: 200, description: 'Phone verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  async verify(@GetUser() user: JwtUser, @Body() dto: VerifyCodeDto) {
    return this.phoneVerificationService.verifyCodeForUser(user, dto.code);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get phone verification status' })
  @ApiResponse({ status: 200, description: 'Verification status retrieved' })
  async getStatus(@GetUser() user: JwtUser) {
    return this.phoneVerificationService.getVerificationStatusForUser(user);
  }
}
