import { UserRole } from '@prisma/client';
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ComplianceService } from './services/compliance.service';

@ApiTags('Compliance')
@Controller('admin/compliance')
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
  @ApiQuery({ name: 'locale', required: false, enum: ['en', 'ru', 'ro'] })
  async downloadDpia(
    @Query('locale') locale: string = 'en',
    @Res() res: Response,
  ) {
    await this.complianceService.streamDpiaPdf(res, locale);
  }

  @Get('ropa')
  @ApiOperation({ summary: 'Download ROPA report as PDF' })
  @ApiQuery({ name: 'locale', required: false, enum: ['en', 'ru', 'ro'] })
  async downloadRopa(
    @Query('locale') locale: string = 'en',
    @Res() res: Response,
  ) {
    await this.complianceService.streamRopaPdf(res, locale);
  }
}
