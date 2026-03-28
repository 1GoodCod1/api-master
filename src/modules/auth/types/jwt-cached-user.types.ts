export interface CachedUserProfile {
  id: string;
  email: string;
  phone: string | null;
  firstName?: string | null;
  role: string;
  phoneVerified?: boolean;
  isVerified?: boolean;
  masterProfile: unknown;
  isBanned: boolean;
}
