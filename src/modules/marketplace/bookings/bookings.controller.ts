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
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../../common/decorators/get-user.decorator';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'MASTER')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create booking (CLIENT: for self, optionally from lead; MASTER: from lead only)',
  })
  @ApiResponse({ status: 201, description: 'Booking created' })
  async create(@Body() dto: CreateBookingDto, @Req() req: RequestWithUser) {
    return this.bookingsService.createFromRequest(dto, req.user);
  }

  @Get('master/:masterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get bookings for master' })
  @ApiQuery({ name: 'status', required: false })
  async findAllForMaster(
    @Param('masterId') masterId: string,
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
  ) {
    return this.bookingsService.findAllForMasterWithAuth(
      masterId,
      status,
      req.user,
    );
  }

  @Get('master/:masterId/calendar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get calendar data: bookings + leads without booking',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2024-03-31' })
  async getCalendar(
    @Param('masterId') masterId: string,
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bookingsService.getCalendarWithAuth(
      masterId,
      status,
      startDate,
      endDate,
      req.user,
    );
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my bookings (for clients)' })
  async findAllForClient(@Req() req: RequestWithUser) {
    return this.bookingsService.findAllForClientWithAuth(req.user);
  }

  @Get('master/:masterId/available-slots')
  @ApiOperation({ summary: 'Get available booking slots for master on a date' })
  @ApiQuery({ name: 'date', required: true, example: '2024-01-20' })
  async getAvailableSlots(
    @Param('masterId') masterId: string,
    @Query('date') date: string,
  ) {
    return this.bookingsService.getAvailableSlots(masterId, date);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update booking status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.bookingsService.updateStatusWithAuth(id, dto, req.user);
  }

  @Get(':id/rebook-info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get rebook info from previous booking (for "Book Again" feature)',
  })
  async getRebookInfo(
    @Param('id') bookingId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.bookingsService.getRebookInfo(bookingId, req.user.id);
  }
}
