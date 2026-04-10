import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CONTROLLER_PATH } from '../../../common/constants';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { GetUser, Roles } from '../../../common/decorators';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { LeadsQueryService } from './services/leads-query.service';

@ApiTags('Leads Query')
@Controller(CONTROLLER_PATH.leads)
export class LeadsQueryController {
  constructor(private readonly queryService: LeadsQueryService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get lead statistics' })
  async getStats(@GetUser() user: JwtUser) {
    return this.queryService.getStats(user);
  }

  @Get('clients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get aggregated client list for master (grouped by phone)',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  async getClients(
    @GetUser() user: JwtUser,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.queryService.getClients(user, { search, sortBy, sortOrder });
  }

  @Get('active-to-master/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check if client has an active lead to a specific master',
  })
  @ApiResponse({ status: 200, description: 'Returns active lead info or null' })
  async getActiveLeadToMaster(
    @Param('masterId') masterId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.queryService.getActiveLeadToMaster(user.id, masterId);
  }

  @Get('completed-to-master/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check if client has a completed (CLOSED) lead to a specific master',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns hasCompletedLead flag and last closed lead info',
  })
  async getCompletedLeadToMaster(
    @Param('masterId') masterId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.queryService.getCompletedLeadToMaster(user.id, masterId);
  }
}
