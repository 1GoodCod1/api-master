import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { SubscribeToAvailabilityDto } from './dto/subscribe-to-availability.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import type { RequestWithUser } from '../../../common/decorators/get-user.decorator';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create new lead',
    description:
      'Only authorized clients can create leads. Authentication and CLIENT role required.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Spam protection triggered' })
  async create(
    @Body() createLeadDto: CreateLeadDto,
    @GetUser() user: JwtUser,
    @Req() req: RequestWithUser,
  ) {
    const ipAddress =
      req.ip ||
      (req.headers['x-forwarded-for'] as string | undefined) ||
      req.socket?.remoteAddress;
    return this.leadsService.create(createLeadDto, user, ipAddress);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get lead statistics' })
  async getStats(@GetUser() user: JwtUser) {
    return this.leadsService.getStats(user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN', 'CLIENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get leads for authenticated user (cursor-paginated)',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async findAll(
    @GetUser() user: JwtUser,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
  ) {
    return this.leadsService.findAll(user, {
      status,
      limit: limit ? Math.min(100, Math.max(1, Number(limit) || 20)) : 20,
      cursor,
      page: page ? Number(page) : undefined,
    });
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update lead status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateLeadStatusDto,
    @GetUser() user: JwtUser,
  ) {
    return this.leadsService.updateStatus(id, user, updateDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN', 'CLIENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get one lead (master: own; client: own by clientId)',
  })
  async findOne(@Param('id') idOrEncoded: string, @GetUser() user: JwtUser) {
    return this.leadsService.findOne(idOrEncoded, user);
  }

  @Get('active-to-master/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check if client has an active lead to a specific master',
  })
  @ApiResponse({ status: 200, description: 'Returns active lead info or null' })
  async getActiveLeadToMaster(
    @Param('masterId') masterId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.leadsService.getActiveLeadToMaster(user.id, masterId);
  }

  @Get('availability-subscription/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if subscribed to master availability' })
  @ApiResponse({ status: 200, description: 'Returns subscription status' })
  async checkAvailabilitySubscription(
    @Param('masterId') masterId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.leadsService.checkAvailabilitySubscription(user.id, masterId);
  }

  @Post('subscribe-availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to master availability notifications' })
  @ApiResponse({ status: 201, description: 'Subscribed successfully' })
  async subscribeToAvailability(
    @Body() dto: SubscribeToAvailabilityDto,
    @GetUser() user: JwtUser,
  ) {
    return this.leadsService.subscribeToAvailability(user.id, dto.masterId);
  }

  @Post('unsubscribe-availability/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unsubscribe from master availability notifications',
  })
  async unsubscribeFromAvailability(
    @Param('masterId') masterId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.leadsService.unsubscribeFromAvailability(user.id, masterId);
  }
}
