import type { Socket } from 'socket.io';
import { UserRole } from '@prisma/client';
import type { ChatUser, SocketAuthData } from '../chat.types';

const USER_ROLES: UserRole[] = ['ADMIN', 'CLIENT', 'MASTER'];

export function parseUserRole(value: string): UserRole | undefined {
  return USER_ROLES.includes(value as UserRole)
    ? (value as UserRole)
    : undefined;
}

/**
 * Extract ChatUser from socket data (set by WsJwtGuard / handleConnection).
 * Returns null if not authenticated.
 */
export function getChatUserFromSocket(client: Socket): ChatUser | null {
  const socketData = client.data as SocketAuthData;
  const userId =
    typeof socketData.userId === 'string' ? socketData.userId : undefined;
  const userRole = parseUserRole(
    typeof socketData.userRole === 'string' ? socketData.userRole : '',
  );
  if (!userId || !userRole) return null;
  return { id: userId, role: userRole };
}
