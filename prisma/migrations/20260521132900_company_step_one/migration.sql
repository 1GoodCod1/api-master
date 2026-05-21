-- Company step one: core company tables and RLS isolation.

CREATE TYPE "CompanyRole" AS ENUM ('OWNER', 'MANAGER', 'MEMBER');
CREATE TYPE "CompanyMemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS text AS $$
  SELECT current_setting('app.current_user_id', true)
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_current_company_id()
RETURNS text AS $$
  SELECT current_setting('app.current_company_id', true)
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_user_role()
RETURNS text AS $$
  SELECT current_setting('app.user_role', true)
$$ LANGUAGE sql STABLE;

CREATE TABLE "companies" (
  "id"            TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "slug"          TEXT          NOT NULL,
  "ownerUserId"   TEXT          NOT NULL,
  "name"          VARCHAR(160)  NOT NULL,
  "legalName"     VARCHAR(240)  NOT NULL,
  "idno"          VARCHAR(13)   NOT NULL,
  "legalAddress"  VARCHAR(500)  NOT NULL,
  "isTvaPayer"    BOOLEAN       NOT NULL DEFAULT false,
  "tvaCode"       VARCHAR(64),
  "description"   VARCHAR(3000),
  "cityId"        TEXT          NOT NULL,
  "categoryId"    TEXT,
  "logoFileId"    TEXT,
  "coverFileId"   TEXT,
  "rating"        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "totalReviews"  INTEGER       NOT NULL DEFAULT 0,
  "teamSize"      INTEGER       NOT NULL DEFAULT 1,
  "isPublished"   BOOLEAN       NOT NULL DEFAULT false,
  "isVerified"    BOOLEAN       NOT NULL DEFAULT false,
  "contactPhone"  VARCHAR(32),
  "contactEmail"  VARCHAR(320),
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "companies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "companies_slug_key" UNIQUE ("slug"),
  CONSTRAINT "companies_idno_key" UNIQUE ("idno"),
  CONSTRAINT "companies_idno_check" CHECK ("idno" ~ '^[0-9]{13}$')
);

CREATE TABLE "company_members" (
  "id"        TEXT                  NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId" TEXT                  NOT NULL,
  "userId"    TEXT                  NOT NULL,
  "masterId"  TEXT                  UNIQUE,
  "role"      "CompanyRole"         NOT NULL DEFAULT 'MEMBER',
  "status"    "CompanyMemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "joinedAt"  TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3)          NOT NULL,

  CONSTRAINT "company_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_members_companyId_userId_key" UNIQUE ("companyId", "userId")
);

CREATE INDEX "companies_ownerUserId_idx" ON "companies"("ownerUserId");
CREATE INDEX "companies_cityId_idx" ON "companies"("cityId");
CREATE INDEX "companies_categoryId_idx" ON "companies"("categoryId");
CREATE INDEX "companies_isPublished_idx" ON "companies"("isPublished");
CREATE INDEX "companies_isVerified_idx" ON "companies"("isVerified");
CREATE INDEX "companies_rating_idx" ON "companies"("rating");
CREATE INDEX "companies_createdAt_idx" ON "companies"("createdAt");

CREATE INDEX "company_members_companyId_idx" ON "company_members"("companyId");
CREATE INDEX "company_members_userId_idx" ON "company_members"("userId");
CREATE INDEX "company_members_status_idx" ON "company_members"("status");
CREATE INDEX "company_members_role_idx" ON "company_members"("role");

ALTER TABLE "companies" ADD CONSTRAINT "companies_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "companies" ADD CONSTRAINT "companies_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "companies" ADD CONSTRAINT "companies_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "companies" ADD CONSTRAINT "companies_logoFileId_fkey"
  FOREIGN KEY ("logoFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "companies" ADD CONSTRAINT "companies_coverFileId_fkey"
  FOREIGN KEY ("coverFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "company_members" ADD CONSTRAINT "company_members_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_masterId_fkey"
  FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;
ALTER TABLE "company_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_members" FORCE ROW LEVEL SECURITY;

CREATE POLICY "companies_select_policy" ON "companies"
  FOR SELECT
  USING (
    "isPublished" = true
    OR "ownerUserId" = app_current_user_id()
    OR "id" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "companies_insert_policy" ON "companies"
  FOR INSERT
  WITH CHECK (
    "ownerUserId" = app_current_user_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "companies_update_policy" ON "companies"
  FOR UPDATE
  USING (
    "ownerUserId" = app_current_user_id()
    OR app_user_role() = 'ADMIN'
  )
  WITH CHECK (
    "ownerUserId" = app_current_user_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "companies_delete_policy" ON "companies"
  FOR DELETE
  USING (
    "ownerUserId" = app_current_user_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_members_select_policy" ON "company_members"
  FOR SELECT
  USING (
    "companyId" = app_current_company_id()
    OR "userId" = app_current_user_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_members_insert_policy" ON "company_members"
  FOR INSERT
  WITH CHECK (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_members_update_policy" ON "company_members"
  FOR UPDATE
  USING (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  )
  WITH CHECK (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_members_delete_policy" ON "company_members"
  FOR DELETE
  USING (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );
