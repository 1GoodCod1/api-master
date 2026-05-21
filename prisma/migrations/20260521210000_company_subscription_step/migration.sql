-- Company subscription skeleton: plans, RLS, backfill existing companies.

CREATE TYPE "CompanySubscriptionPlan" AS ENUM ('FREE', 'PRO', 'BUSINESS');
CREATE TYPE "CompanySubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

CREATE TABLE "company_subscriptions" (
  "id"          TEXT                        NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId"   TEXT                        NOT NULL,
  "plan"        "CompanySubscriptionPlan"   NOT NULL DEFAULT 'FREE',
  "status"      "CompanySubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "periodStart" TIMESTAMP(3)                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "periodEnd"   TIMESTAMP(3),
  "activatedBy" TEXT,
  "createdAt"   TIMESTAMP(3)                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)                NOT NULL,

  CONSTRAINT "company_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_subscriptions_companyId_key" UNIQUE ("companyId")
);

CREATE INDEX "company_subscriptions_plan_idx" ON "company_subscriptions"("plan");
CREATE INDEX "company_subscriptions_status_idx" ON "company_subscriptions"("status");

ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "company_subscriptions" ("id", "companyId", "plan", "status", "periodStart", "updatedAt")
SELECT gen_random_uuid()::text, c."id", 'FREE', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "companies" c
WHERE NOT EXISTS (
  SELECT 1 FROM "company_subscriptions" s WHERE s."companyId" = c."id"
);

ALTER TABLE "company_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_subscriptions" FORCE ROW LEVEL SECURITY;

CREATE POLICY "company_subscriptions_select_policy" ON "company_subscriptions"
  FOR SELECT
  USING (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_subscriptions_insert_policy" ON "company_subscriptions"
  FOR INSERT
  WITH CHECK (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_subscriptions_update_policy" ON "company_subscriptions"
  FOR UPDATE
  USING (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  )
  WITH CHECK (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_subscriptions_delete_policy" ON "company_subscriptions"
  FOR DELETE
  USING (
    app_user_role() = 'ADMIN'
  );
