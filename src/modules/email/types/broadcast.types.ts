export type UserRecipient = {
  id: string;
  email: string;
  firstName: string | null;
  preferredLanguage: string | null;
};

export type BroadcastSegment =
  | 'all_masters'
  | 'new_masters'
  | 'all_clients'
  | 'digest_subscribers';

export interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
}
