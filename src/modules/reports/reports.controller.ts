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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles, type RequestWithUser } from '../../common/decorators';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CONTROLLER_PATH } from '../../common/constants';

@ApiTags('Reports')
@Controller(CONTROLLER_PATH.reports)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create report (for clients only)' })
  async create(@Body() dto: CreateReportDto, @Req() req: RequestWithUser) {
    return this.reportsService.create(req.user.id, dto);
  }

  @Get('my-reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my reports (for clients)' })
  async getMyReports(@Req() req: RequestWithUser) {
    return this.reportsService.findByClient(req.user.id);
  }

  @Get('reports-against-me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get count of reports against master (for self)' })
  async getReportsAgainstMeCount(@Req() req: RequestWithUser) {
    const masterId = req.user.masterProfile?.id;
    if (!masterId) return { count: 0 };
    const count =
      await this.reportsService.getReportsAgainstMasterCount(masterId);
    return { count };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Report counts by status (global totals, admin only)',
  })
  async getStats() {
    return this.reportsService.getStats();
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Export all reports matching optional status (admin only)',
  })
  @ApiQuery({ name: 'status', required: false })
  async export(@Query('status') status?: string) {
    return this.reportsService.exportAll(status);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all reports (admin only)' })
  @ApiQuery({ name: 'status', required: false })
  async findAll(@Query('status') status?: string) {
    return this.reportsService.findAll(status);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update report status (admin only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReportStatusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.reportsService.updateStatus(id, req.user.id, dto);
  }
}
