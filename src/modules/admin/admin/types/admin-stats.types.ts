export type AdminLeadsStats = {
  total: number;
  newCount: number;
  inProgressCount: number;
  closedCount: number;
  premiumCount: number;
};

export type AdminReviewsStats = {
  total: number;
  pendingCount: number;
  visibleCount: number;
  hiddenCount: number;
  reportedCount: number;
};

export type AdminPaymentsStats = {
  total: number;
  pendingCount: number;
  paidCount: number;
  failedCount: number;
  totalRevenue: number;
};
