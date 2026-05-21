-- Company step four: provider services, portfolio photos, and public marketplace data.

CREATE TYPE "CompanyServicePriceType" AS ENUM ('FIXED', 'NEGOTIABLE');

CREATE TABLE "company_services" (
  "id"          TEXT                     NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId"   TEXT                     NOT NULL,
  "title"       VARCHAR(200)             NOT NULL,
  "description" VARCHAR(1000),
  "priceType"   "CompanyServicePriceType" NOT NULL DEFAULT 'NEGOTIABLE',
  "price"       DECIMAL(65,30),
  "currency"    VARCHAR(3)               NOT NULL DEFAULT 'MDL',
  "sortOrder"   INTEGER                  NOT NULL DEFAULT 0,
  "isActive"    BOOLEAN                  NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)             NOT NULL,

  CONSTRAINT "company_services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "company_photos" (
  "id"        TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId" TEXT         NOT NULL,
  "fileId"    TEXT         NOT NULL,
  "caption"   VARCHAR(300),
  "order"     INTEGER      NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "company_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "company_services_companyId_idx" ON "company_services"("companyId");
CREATE INDEX "company_services_companyId_isActive_sortOrder_idx"
  ON "company_services"("companyId", "isActive", "sortOrder");

CREATE INDEX "company_photos_companyId_idx" ON "company_photos"("companyId");
CREATE INDEX "company_photos_companyId_order_idx" ON "company_photos"("companyId", "order");

ALTER TABLE "company_services" ADD CONSTRAINT "company_services_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_photos" ADD CONSTRAINT "company_photos_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_photos" ADD CONSTRAINT "company_photos_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_photos" FORCE ROW LEVEL SECURITY;
ALTER TABLE "company_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_services" FORCE ROW LEVEL SECURITY;

CREATE POLICY "company_services_select_policy" ON "company_services"
  FOR SELECT
  USING (
    "companyId" = app_current_company_id()
    OR EXISTS (
      SELECT 1 FROM "companies" c
      WHERE c."id" = "company_services"."companyId"
        AND c."isPublished" = true
    )
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_services_insert_policy" ON "company_services"
  FOR INSERT
  WITH CHECK (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_services_update_policy" ON "company_services"
  FOR UPDATE
  USING (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  )
  WITH CHECK (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_services_delete_policy" ON "company_services"
  FOR DELETE
  USING (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_photos_select_policy" ON "company_photos"
  FOR SELECT
  USING (
    "companyId" = app_current_company_id()
    OR EXISTS (
      SELECT 1 FROM "companies" c
      WHERE c."id" = "company_photos"."companyId"
        AND c."isPublished" = true
    )
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_photos_insert_policy" ON "company_photos"
  FOR INSERT
  WITH CHECK (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_photos_update_policy" ON "company_photos"
  FOR UPDATE
  USING (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  )
  WITH CHECK (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_photos_delete_policy" ON "company_photos"
  FOR DELETE
  USING (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );
