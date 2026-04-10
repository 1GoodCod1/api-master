import { UserRole } from '@prisma/client';
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
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import {
  ApiPaginationQueries,
  GetUser,
  Roles,
  type RequestWithUser,
} from '../../../common/decorators';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { CONTROLLER_PATH } from '../../../common/constants';
import { LeadsListService } from './services/leads-list.service';
import { LeadsActionsService } from './services/leads-actions.service';

@ApiTags('Leads')
@Controller(CONTROLLER_PATH.leads)
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly listService: LeadsListService,
    private readonly actionsService: LeadsActionsService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create new lead',
    description:
      'Only authorized clients can create leads. Authentication and CLIENT role required.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
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

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get leads for authenticated user (cursor-paginated)',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiPaginationQueries()
  async findAll(
    @GetUser() user: JwtUser,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
  ) {
    return this.listService.findAll(user, {
      status,
      limit: limit ? Math.min(100, Math.max(1, Number(limit) || 20)) : 20,
      cursor,
      page: page ? Number(page) : undefined,
    });
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update lead status',
    description:
      'Master: can transition statuses (e.g. IN_PROGRESS → PENDING_CLOSE). ' +
      'Client: can confirm (PENDING_CLOSE → CLOSED) or reject (PENDING_CLOSE → IN_PROGRESS) closure.',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateLeadStatusDto,
    @GetUser() user: JwtUser,
  ) {
    return this.actionsService.updateStatus(id, user, updateDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get one lead (master: own; client: own by clientId)',
  })
  async findOne(@Param('id') idOrEncoded: string, @GetUser() user: JwtUser) {
    return this.listService.findOne(idOrEncoded, user);
  }
}
