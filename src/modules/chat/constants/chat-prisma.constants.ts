import type { Prisma } from '@prisma/client';

/** Shared Prisma include for message with files */
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

/** Shared Prisma select for lead in conversation context */
export const LEAD_SELECT_BASIC = {
  id: true,
  clientName: true,
  clientPhone: true,
  message: true,
  status: true,
} as const;

/** Shared Prisma select for client in conversation context */
export const CLIENT_SELECT_BASIC = {
  id: true,
  email: true,
  avatarFile: { select: { path: true } },
} as const;
