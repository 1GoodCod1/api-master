import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingsQueryService } from './services/bookings-query.service';
import { BookingsActionService } from './services/bookings-action.service';
import type { BookingsAuthUser } from './types/bookings-auth-user.types';

/**
 * Координатор модуля бронирований.
 * Делегирует запросы в BookingsQueryService и мутации в BookingsActionService.
 */
@Injectable()
export class BookingsService {
  constructor(
    private readonly queryService: BookingsQueryService,
    private readonly actionService: BookingsActionService,
  ) {}

  /**
   * Создание бронирования. Резолвит phone/name из user (для контроллера).
   */
  async createFromRequest(dto: CreateBookingDto, user: BookingsAuthUser) {
    const { phone, name } = this.resolvePhoneAndName(user);
    return this.actionService.create(dto, phone, name, user);
  }

  create(
    dto: CreateBookingDto,
    clientPhone: string,
    clientName: string | undefined,
    authUser: BookingsAuthUser,
  ) {
    return this.actionService.create(dto, clientPhone, clientName, authUser);
  }

  findAllForMaster(masterId: string, status?: string) {
    return this.queryService.findAllForMaster(masterId, status);
  }

  findAllForClient(userId: string, clientPhone: string) {
    return this.queryService.findAllForClient(userId, clientPhone);
  }

  getAvailableSlots(masterId: string, date: string) {
    return this.queryService.getAvailableSlots(masterId, date);
  }

  getCalendar(
    masterId: string,
    status?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.queryService.getCalendar(masterId, status, startDate, endDate);
  }

  getCalendarFromQuery(
    masterId: string,
    status?: string,
    startDate?: string,
    endDate?: string,
  ) {
    return this.queryService.getCalendarFromQuery(
      masterId,
      status,
      startDate,
      endDate,
    );
  }

  updateStatus(
    bookingId: string,
    masterId: string,
    dto: UpdateBookingStatusDto,
  ) {
    return this.actionService.updateStatus(bookingId, masterId, dto);
  }

  getRebookInfo(bookingId: string, userId: string) {
    return this.queryService.getRebookInfo(bookingId, userId);
  }

  /** Бронирования мастера с проверкой доступа (ADMIN — любой, MASTER — только свой). */
  findAllForMasterWithAuth(
    masterId: string,
    status: string | undefined,
    user: BookingsAuthUser,
  ) {
    this.ensureMasterAccess(masterId, user);
    return this.findAllForMaster(masterId, status);
  }

  /** Календарь мастера с проверкой доступа. */
  getCalendarWithAuth(
    masterId: string,
    status: string | undefined,
    startDate: string | undefined,
    endDate: string | undefined,
    user: BookingsAuthUser,
  ) {
    this.ensureMasterAccess(masterId, user);
    return this.getCalendarFromQuery(masterId, status, startDate, endDate);
  }

  /** Бронирования клиента (только для роли CLIENT). */
  findAllForClientWithAuth(user: BookingsAuthUser) {
    const { userId, phone } = this.ensureClientAndGetIds(user);
    return this.findAllForClient(userId, phone);
  }

  /** Обновление статуса с проверкой master profile. */
  updateStatusWithAuth(
    bookingId: string,
    dto: UpdateBookingStatusDto,
    user: BookingsAuthUser,
  ) {
    const masterId = this.ensureMasterProfile(user);
    return this.updateStatus(bookingId, masterId, dto);
  }

  private ensureMasterAccess(masterId: string, user: BookingsAuthUser): void {
    if (user.role === 'ADMIN') return;
    const master = user.masterProfile;
    if (!master || master.id !== masterId) {
      throw new ForbiddenException('You can only access your own data');
    }
  }

  private ensureClientAndGetIds(user: BookingsAuthUser): {
    userId: string;
    phone: string;
  } {
    if (user.role !== 'CLIENT') {
      throw new BadRequestException('This endpoint is only for clients');
    }
    return { userId: user.id, phone: user.phone ?? '' };
  }

  private ensureMasterProfile(user: BookingsAuthUser): string {
    const master = user.masterProfile;
    if (!master) {
      throw new ForbiddenException('Master profile not found');
    }
    return master.id;
  }

  private resolvePhoneAndName(user: BookingsAuthUser): {
    phone: string;
    name: string | undefined;
  } {
    if (user.role === 'CLIENT') {
      const phone = user.phone ?? '';
      if (!phone) {
        throw new BadRequestException('Client phone is required');
      }
      return { phone, name: user.firstName ?? undefined };
    }
    return { phone: '', name: undefined };
  }
}
