import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConsentService } from './services/consent.service';
import { GrantConsentDto } from './dto/grant-consent.dto';

@ApiTags('Consent')
@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post('grant')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Grant consent (GDPR compliant)' })
  @ApiResponse({ status: 201, description: 'Consent recorded' })
  async grantConsent(
    @GetUser() user: JwtUser,
    @Body() dto: GrantConsentDto,
    @Req() req: Request,
  ) {
    const consent = await this.consentService.grantConsent(
      user.id,
      dto.consentType,
      {
        ipAddress: req.ip ?? req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
        version: dto.version,
      },
    );
    return { message: 'Consent recorded', consentId: consent.id };
  }

  @Post('revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke consent (GDPR right to withdraw)' })
  @ApiResponse({ status: 201, description: 'Consent revoked' })
  async revokeConsent(@GetUser() user: JwtUser, @Body() dto: GrantConsentDto) {
    await this.consentService.revokeConsent(user.id, dto.consentType);
    return { message: 'Consent revoked' };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my consents' })
  @ApiResponse({ status: 200, description: 'List of user consents' })
  async getMyConsents(@GetUser() user: JwtUser) {
    return this.consentService.getUserConsents(user.id);
  }
}
