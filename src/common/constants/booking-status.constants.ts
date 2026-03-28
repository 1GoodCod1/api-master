import { BookingStatus } from '@prisma/client';

/**
 * Бронирования, по которым слот ещё считается занятым (не COMPLETED / CANCELLED).
 * Пересечения по времени, напоминания, список «активных» записей.
 * COMPLETED и CANCELLED сюда не добавляем — по определению не участвуют в занятости слота.
 */
export const ACTIVE_BOOKING_STATUSES: ReadonlyArray<BookingStatus> = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];
