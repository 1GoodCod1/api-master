export type ConversationForAccessCheck = {
  masterId: string;
  clientId: string | null;
  master?: { userId: string };
};
