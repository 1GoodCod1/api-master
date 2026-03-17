import type { UserRole } from '@prisma/client';

/**
 * Минимальный тип пользователя для операций с бронированиями.
 */
export type BookingsAuthUser = {
  id: string;
  role: UserRole;
  phone?: string | null;
  firstName?: string | null;
  phoneVerified?: boolean;
  masterProfile?: { id: string } | null;
};
