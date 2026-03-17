import type { Prisma } from '@prisma/client';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';

/** Minimal user for chat - HTTP has full JwtUser, WebSocket has { id, role } */
export type ChatUser = Pick<JwtUser, 'id' | 'role'>;

export type MessageWithFiles = Prisma.MessageGetPayload<{
  include: {
    files: {
      include: {
        file: {
          select: {
            id: true;
            filename: true;
            path: true;
            mimetype: true;
            size: true;
          };
        };
      };
    };
  };
}>;

export type ConversationInfo = {
  id: string;
  masterId: string;
  clientId: string | null;
  clientPhone: string | null;
  clientName?: string;
  masterUserId: string;
  masterName?: string;
};

export type OutgoingChatMessage = MessageWithFiles & {
  conversation: ConversationInfo;
};

export type SendMessageOutcome = {
  message: OutgoingChatMessage;
  autoReply?: OutgoingChatMessage;
};

/** Shape of client.data set by WsJwtGuard */
export interface SocketAuthData {
  userId?: string;
  userRole?: string;
}

export interface JwtPayload {
  sub: string;
  role?: string;
}
