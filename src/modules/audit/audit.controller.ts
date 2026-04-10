import { UserRole } from '@prisma/client';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ANALYTICS_TIMEFRAMES, CONTROLLER_PATH } from '../../common/constants';
import { AuditService } from './audit.service';
import { AuditCleanupDto } from './dto/audit-cleanup.dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { ApiPaginationQueries, Roles } from '../../common/decorators';
import { UseGuards } from '@nestjs/common';

@ApiTags('Audit')
@Controller(CONTROLLER_PATH.audit)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
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
  @ApiPaginationQueries({ cursor: false })
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
    enum: [...ANALYTICS_TIMEFRAMES],
  })
  async getStats(@Query('timeframe') timeframe?: string) {
    return this.auditService.getStatsFromQuery(timeframe);
  }

  @Post('cleanup')
  @ApiOperation({
    summary: 'Bulk-delete audit logs (admin)',
    description:
      'Scope: non_consent (all except consent actions), groups (union of preset groups), or actions (explicit list). Prefer olderThan. Use dryRun to preview counts.',
  })
  async cleanup(@Body() dto: AuditCleanupDto) {
    return this.auditService.cleanupAuditLogs(dto);
  }
}
