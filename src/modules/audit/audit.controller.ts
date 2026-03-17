import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get audit logs (admin only)' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string | number,
    @Query('limit') limit?: string | number,
  ) {
    return this.auditService.getLogsFromQuery({
      userId,
      action,
      entityType,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  @Get('stream')
  @ApiOperation({ summary: 'Get recent audit stream (admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentStream(@Query('limit') limit?: string | number) {
    return this.auditService.getRecentStreamFromQuery(limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit statistics (admin only)' })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['day', 'week', 'month'],
  })
  async getStats(@Query('timeframe') timeframe?: string) {
    return this.auditService.getStatsFromQuery(timeframe);
  }
}
