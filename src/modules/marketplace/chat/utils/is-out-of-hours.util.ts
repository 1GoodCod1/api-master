import { getHourInMoldova } from '../../../shared/utils/timezone.util';

export function isOutOfHours(
  workStartHour: number,
  workEndHour: number,
  now: Date = new Date(),
): boolean {
  const hour = getHourInMoldova(now);

  // Normalize to 0..24 bounds defensively
  const start = Math.min(Math.max(workStartHour, 0), 23);
  const end = Math.min(Math.max(workEndHour, 1), 24);

  // Typical day shift: start < end (this is enforced in schedule settings)
  if (start < end) {
    return hour < start || hour >= end;
  }

  // Fallback for night shifts (e.g. 22..6)
  return hour < start && hour >= end;
}
