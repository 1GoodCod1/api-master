import { getHourInMoldova } from '../../../shared/utils/timezone.util';

export function isOutOfHours(
  workStartHour: number,
  workEndHour: number,
  now: Date = new Date(),
): boolean {
  const hour = getHourInMoldova(now);

  // Нормализация в пределах 0..24
  const start = Math.min(Math.max(workStartHour, 0), 23);
  const end = Math.min(Math.max(workEndHour, 1), 24);

  // Обычная дневная смена: start < end (так задано в настройках расписания)
  if (start < end) {
    return hour < start || hour >= end;
  }

  // Ночная смена (напр. 22..6)
  return hour < start && hour >= end;
}
