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
  BadRequestException,
  ForbiddenException,
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../common/decorators/get-user.decorator';

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
    const user = req.user;

    let phone: string;
    let name: string | undefined;

    if (user.role === 'CLIENT') {
      phone = user.phone ?? '';
      name = user.firstName ?? undefined;
      if (!phone) {
        throw new BadRequestException('Client phone is required');
      }
    } else {
      // MASTER: service will resolve phone/name from lead
      phone = '';
      name = undefined;
    }

    return this.bookingsService.create(dto, phone, name, user);
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
    const user = req.user;
    if (user.role !== 'ADMIN') {
      const master = user.masterProfile;
      if (!master || master.id !== masterId) {
        throw new ForbiddenException('You can only view your own bookings');
      }
    }

    return this.bookingsService.findAllForMaster(masterId, status);
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
    const user = req.user;
    if (user.role !== 'ADMIN') {
      const master = user.masterProfile;
      if (!master || master.id !== masterId) {
        throw new BadRequestException('You can only view your own calendar');
      }
    }
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.bookingsService.getCalendar(masterId, status, start, end);
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my bookings (for clients)' })
  async findAllForClient(@Req() req: RequestWithUser) {
    const user = req.user;
    if (user.role !== 'CLIENT') {
      throw new BadRequestException('This endpoint is only for clients');
    }
    const phone = user.phone || '';
    return this.bookingsService.findAllForClient(user.id, phone);
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
    const master = req.user.masterProfile;
    if (!master) {
      throw new ForbiddenException('Master profile not found');
    }
    return this.bookingsService.updateStatus(id, master.id, dto);
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
