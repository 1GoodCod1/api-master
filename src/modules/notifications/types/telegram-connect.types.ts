export interface TelegramConnectLink {
  link: string;
  expiresAt: string;
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
}
