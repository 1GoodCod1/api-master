-- Company step three: link jobs to companies as customer requests.

ALTER TABLE "jobs" ADD COLUMN "companyId" TEXT;

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "jobs_companyId_idx" ON "jobs"("companyId");
CREATE INDEX "jobs_companyId_status_createdAt_idx" ON "jobs"("companyId", "status", "createdAt");
