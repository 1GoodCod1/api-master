import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { UserRole } from '@prisma/client';
import type { ChatUser } from '../chat.types';

export type ConversationForAccessCheck = {
  masterId: string;
  clientId: string | null;
  master?: { userId: string };
};

/**
 * Check if user has access to conversation. Throws ForbiddenException if not.
 */
export function checkConversationAccess(
  conversation: ConversationForAccessCheck,
  user: ChatUser,
): void {
  if (user.role === UserRole.ADMIN) {
    return;
  }

  const masterUserId = conversation.master?.userId;

  if (user.role === UserRole.MASTER) {
    if (masterUserId !== user.id) {
      throw AppErrors.forbidden(AppErrorMessages.ACCESS_DENIED_CONVERSATION);
    }
  } else if (user.role === UserRole.CLIENT) {
    if (conversation.clientId !== user.id) {
      throw AppErrors.forbidden(AppErrorMessages.ACCESS_DENIED_CONVERSATION);
    }
  } else {
    throw AppErrors.forbidden(AppErrorMessages.INVALID_ROLE);
  }
}
