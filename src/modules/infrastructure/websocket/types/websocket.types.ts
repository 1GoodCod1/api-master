import type { UserRole } from '@prisma/client';

export interface SocketData {
  userId?: string;
  role?: UserRole;
}

/** JWT payload после verify при установке WS-соединения (роль строго UserRole). */
export interface WebsocketJwtPayload {
  sub: string;
  role: UserRole;
}

/** Payload в WsJwtGuard (роль из токена может быть произвольной строкой). */
export interface WsJwtGuardPayload {
  sub: string;
  role?: string;
}
