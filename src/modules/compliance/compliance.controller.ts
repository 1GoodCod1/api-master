import { UserRole } from '@prisma/client';
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import {
  APP_LOCALE,
  APP_LOCALES,
  CONTROLLER_PATH,
} from '../../common/constants';
import { ComplianceService } from './services/compliance.service';

@ApiTags('Compliance')
@Controller(CONTROLLER_PATH.adminCompliance)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get compliance overview stats' })
  async getOverview() {
    return this.complianceService.getComplianceOverview();
  }

  @Get('dpia')
  @ApiOperation({ summary: 'Download DPIA report as PDF' })
  @ApiQuery({
    name: 'locale',
    required: false,
    enum: [...APP_LOCALES],
  })
  async downloadDpia(
    @Query('locale') locale: string = APP_LOCALE.EN,
    @Res() res: Response,
  ) {
    await this.complianceService.streamDpiaPdf(res, locale);
  }

  @Get('ropa')
  @ApiOperation({ summary: 'Download ROPA report as PDF' })
  @ApiQuery({
    name: 'locale',
    required: false,
    enum: [...APP_LOCALES],
  })
  async downloadRopa(
    @Query('locale') locale: string = APP_LOCALE.EN,
    @Res() res: Response,
  ) {
    await this.complianceService.streamRopaPdf(res, locale);
  }
}
