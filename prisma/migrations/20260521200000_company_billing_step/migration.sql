-- Company step eight: billing fields, job documents, company reviews, job-linked master reviews.

CREATE TYPE "JobDocumentKind" AS ENUM ('INVOICE', 'ACT', 'OTHER');

ALTER TABLE "companies"
  ADD COLUMN "billingEmail" VARCHAR(320),
  ADD COLUMN "billingPhone" VARCHAR(32),
  ADD COLUMN "bankName" VARCHAR(160),
  ADD COLUMN "bankAccount" VARCHAR(64);

ALTER TABLE "reviews"
  ADD COLUMN "jobId" TEXT,
  ADD COLUMN "companyId" TEXT;

CREATE UNIQUE INDEX "reviews_jobId_key" ON "reviews"("jobId");
CREATE INDEX "reviews_jobId_idx" ON "reviews"("jobId");
CREATE INDEX "reviews_companyId_idx" ON "reviews"("companyId");

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "company_reviews" (
  "id"           TEXT           NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId"    TEXT           NOT NULL,
  "jobId"        TEXT           NOT NULL,
  "authorUserId" TEXT           NOT NULL,
  "rating"       INTEGER        NOT NULL,
  "comment"      TEXT,
  "status"       "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "moderatedBy"  TEXT,
  "moderatedAt"  TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)   NOT NULL,

  CONSTRAINT "company_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_reviews_jobId_key" ON "company_reviews"("jobId");
CREATE INDEX "company_reviews_companyId_idx" ON "company_reviews"("companyId");
CREATE INDEX "company_reviews_authorUserId_idx" ON "company_reviews"("authorUserId");
CREATE INDEX "company_reviews_status_idx" ON "company_reviews"("status");
CREATE INDEX "company_reviews_createdAt_idx" ON "company_reviews"("createdAt");
CREATE INDEX "company_reviews_companyId_status_createdAt_idx"
  ON "company_reviews"("companyId", "status", "createdAt");

ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "job_documents" (
  "id"               TEXT              NOT NULL DEFAULT gen_random_uuid()::text,
  "jobId"            TEXT              NOT NULL,
  "fileId"           TEXT              NOT NULL,
  "kind"             "JobDocumentKind" NOT NULL DEFAULT 'OTHER',
  "label"            VARCHAR(200),
  "uploadedByUserId" TEXT              NOT NULL,
  "createdAt"        TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "job_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_documents_jobId_fileId_key" ON "job_documents"("jobId", "fileId");
CREATE INDEX "job_documents_jobId_idx" ON "job_documents"("jobId");
CREATE INDEX "job_documents_fileId_idx" ON "job_documents"("fileId");
CREATE INDEX "job_documents_uploadedByUserId_idx" ON "job_documents"("uploadedByUserId");

ALTER TABLE "job_documents" ADD CONSTRAINT "job_documents_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_documents" ADD CONSTRAINT "job_documents_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_documents" ADD CONSTRAINT "job_documents_uploadedByUserId_fkey"
  FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_reviews" FORCE ROW LEVEL SECURITY;

CREATE POLICY "company_reviews_select_policy" ON "company_reviews"
  FOR SELECT
  USING (
    "companyId" = app_current_company_id()
    OR "authorUserId" = app_current_user_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_reviews_insert_policy" ON "company_reviews"
  FOR INSERT
  WITH CHECK (
    "authorUserId" = app_current_user_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_reviews_update_policy" ON "company_reviews"
  FOR UPDATE
  USING (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  )
  WITH CHECK (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );

ALTER TABLE "job_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_documents" FORCE ROW LEVEL SECURITY;

CREATE POLICY "job_documents_select_policy" ON "job_documents"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM "jobs" j
      WHERE j."id" = "job_documents"."jobId"
        AND (
          j."clientId" = app_current_user_id()
          OR j."companyId" = app_current_company_id()
          OR app_user_role() = 'ADMIN'
        )
    )
  );

CREATE POLICY "job_documents_insert_policy" ON "job_documents"
  FOR INSERT
  WITH CHECK (
    "uploadedByUserId" = app_current_user_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "job_documents_delete_policy" ON "job_documents"
  FOR DELETE
  USING (
    "uploadedByUserId" = app_current_user_id()
    OR EXISTS (
      SELECT 1
      FROM "jobs" j
      WHERE j."id" = "job_documents"."jobId"
        AND (
          j."clientId" = app_current_user_id()
          OR j."companyId" = app_current_company_id()
        )
    )
    OR app_user_role() = 'ADMIN'
  );
