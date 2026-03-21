import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RefreshCookieService } from './services/refresh-cookie.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { Throttle } from '@nestjs/throttler';
import { extractRequestContext } from '../../shared/utils/request-context.util';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshCookie: RefreshCookieService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);
    return this.refreshCookie.handleAuthSuccess(result, res);
  }

  @Get('registration-options')
  @ApiOperation({
    summary: 'Get available cities and categories for registration',
  })
  async getRegistrationOptions() {
    return this.authService.getRegistrationOptions();
  }

  @Get('early-bird-status')
  @ApiOperation({ summary: 'Get early bird offer status' })
  getEarlyBirdStatus() {
    return this.authService.getEarlyBirdStatus();
  }

  @Post('login')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { ipAddress, userAgent } = extractRequestContext(req);
    const result = await this.authService.login(loginDto, ipAddress, userAgent);
    return this.refreshCookie.handleAuthSuccess(result, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.refreshCookie.handleLogout(
      req,
      res,
      refreshTokenDto.refreshToken,
      (token) => this.authService.logout(token),
    );
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout from all sessions (revokes all refresh tokens)',
  })
  @ApiResponse({ status: 200, description: 'All sessions logged out' })
  async logoutAll(
    @GetUser() user: JwtUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.refreshCookie.clearIfEnabled(res);
    return this.authService.logoutAll(user.id);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.refreshCookie.getTokenOrThrow(
      req,
      refreshTokenDto.refreshToken,
    );
    const result = await this.authService.refreshTokens(token);
    return this.refreshCookie.handleAuthSuccess(result, res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  async getProfile(@GetUser() user: JwtUser) {
    return this.authService.getProfile(user.id);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin endpoint' })
  adminEndpoint() {
    return { message: 'Admin access granted' };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 2, ttl: 300000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset link sent (if email exists)',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
