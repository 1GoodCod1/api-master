export interface TelegramConnectLink {
  link: string;
  expiresAt: string;
}

export type TelegramChatMemberStatus =
  | 'member'
  | 'kicked'
  | 'left'
  | 'banned'
  | 'restricted'
  | 'administrator'
  | 'creator';

export interface TelegramChatMemberUpdate {
  chat?: { id: number; type?: string };
  from?: { id: number; username?: string; first_name?: string };
  new_chat_member?: { status: TelegramChatMemberStatus };
}

export interface TelegramWebhookBody {
  update_id?: number;
  message?: {
    message_id?: number;
    from?: { id: number; username?: string; first_name?: string };
    chat?: { id: number; type?: string };
    text?: string;
    date?: number;
  };
  my_chat_member?: TelegramChatMemberUpdate;
}
