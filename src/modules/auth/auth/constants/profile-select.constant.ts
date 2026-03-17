import type { Prisma } from '@prisma/client';

/**
 * Поля пользователя для эндпоинта профиля.
 * Исключает пароль и чувствительные данные.
 */
export const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  role: true,
  isVerified: true,
  phoneVerified: true,
  isBanned: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  avatarFile: {
    select: { id: true, path: true, filename: true },
  },
  masterProfile: {
    select: {
      id: true,
      tariffType: true,
      tariffExpiresAt: true,
      avatarFile: {
        select: { id: true, path: true, filename: true },
      },
    },
  },
} satisfies Prisma.UserSelect;
