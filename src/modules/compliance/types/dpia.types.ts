export interface DpiaContext {
  organizationName: string;
  dpoName: string;
  dpoEmail: string;
  totalUsers: number;
  totalMasters: number;
  totalLeads: number;
  totalBookings: number;
  totalReviews: number;
  verifiedDocumentsCount: number;
  consentsCount: number;
  encryptionEnabled: boolean;
  backupEnabled: boolean;
  auditLogEnabled: boolean;
  rateLimitEnabled: boolean;
  twoFactorAvailable: boolean;
}
