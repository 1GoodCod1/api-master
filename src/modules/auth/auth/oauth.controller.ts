import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  Next,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RefreshCookieService } from './services/refresh-cookie.service';
import { OAuthService } from './services/oauth.service';
import { CompleteOAuthDto } from './dto/complete-oauth.dto';
import { Public } from '../../../common/decorators';
import {
  CONTROLLER_PATH,
  AUTH_THROTTLER_NAME,
} from '../../../common/constants';
import { OAuthPassportFlowService } from './services/oauth-passport-flow.service';

/** OAuth routes use the global `default` throttler only; skip the login `auth` bucket. */
@SkipThrottle({ [AUTH_THROTTLER_NAME]: true })
@ApiTags('Authentication')
@Controller(CONTROLLER_PATH.auth)
export class OAuthController {
  constructor(
    private readonly refreshCookie: RefreshCookieService,
    private readonly oauthService: OAuthService,
    private readonly oauthPassportFlow: OAuthPassportFlowService,
  ) {}

  @Get('google')
  @Public()
  @ApiOperation({
    summary:
      'Google OAuth: без ?role= — вход (уже привязан → сразу логин); с ?role=CLIENT|MASTER — регистрация с выбранной ролью',
  })
  googleAuth(
    @Query('role') role: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    this.oauthPassportFlow.beginGoogle(role, req, res, next);
  }

  @Get('google/callback')
  @Public()
  @ApiOperation({ summary: 'Google OAuth callback (handled by Passport)' })
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    await this.oauthPassportFlow.handleCallback('google', req, res, next);
  }

  @Post('oauth/complete')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Complete OAuth registration (provide phone + optional master data)',
  })
  @ApiResponse({
    status: 200,
    description: 'Registration completed, tokens returned',
  })
  async completeOAuth(
    @Body() dto: CompleteOAuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const merged = this.refreshCookie.mergeCompleteOAuthDto(req, dto);
    try {
      const result = await this.oauthService.completeOAuthRegistration(merged);
      this.refreshCookie.clearOAuthPendingToken(res);
      return this.refreshCookie.handleAuthSuccess(result, res);
    } catch (e) {
      if (
        e instanceof BadRequestException ||
        e instanceof UnauthorizedException
      ) {
        this.refreshCookie.clearOAuthPendingToken(res);
      }
      throw e;
    }
  }
}
