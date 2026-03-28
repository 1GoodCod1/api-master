import type { Prisma } from '@prisma/client';

/** Общий Prisma `include` для сообщения с файлами. */
export const MESSAGE_INCLUDE_FILES = {
  files: {
    include: {
      file: {
        select: {
          id: true,
          filename: true,
          path: true,
          mimetype: true,
          size: true,
        },
      },
    },
  },
} as const satisfies Prisma.MessageInclude;

/** Базовый Prisma `select` для лида в контексте чата. */
export const LEAD_SELECT_BASIC = {
  id: true,
  clientName: true,
  clientPhone: true,
  message: true,
  status: true,
} as const;

/** Базовый Prisma `select` для клиента в контексте чата. */
export const CLIENT_SELECT_BASIC = {
  id: true,
  email: true,
  avatarFile: { select: { path: true } },
} as const;
