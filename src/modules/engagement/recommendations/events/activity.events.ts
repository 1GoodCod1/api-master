/**
 * События активности пользователей для системы рекомендаций и аналитики.
 */
export enum ActivityEvent {
  TRACKED = 'activity.tracked',
}

export type { ActivityTrackedPayload } from '../types/activity.types';
