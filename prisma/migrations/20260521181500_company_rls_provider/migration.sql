-- Allow company managers to update company records and expose active members on published profiles.

DROP POLICY IF EXISTS "companies_update_policy" ON "companies";

CREATE POLICY "companies_update_policy" ON "companies"
  FOR UPDATE
  USING (
    "ownerUserId" = app_current_user_id()
    OR EXISTS (
      SELECT 1
      FROM "company_members" cm
      WHERE cm."companyId" = "companies"."id"
        AND cm."userId" = app_current_user_id()
        AND cm."status" = 'ACTIVE'
        AND cm."role" IN ('OWNER', 'MANAGER')
        AND cm."leftAt" IS NULL
    )
    OR app_user_role() = 'ADMIN'
  )
  WITH CHECK (
    "ownerUserId" = app_current_user_id()
    OR EXISTS (
      SELECT 1
      FROM "company_members" cm
      WHERE cm."companyId" = "companies"."id"
        AND cm."userId" = app_current_user_id()
        AND cm."status" = 'ACTIVE'
        AND cm."role" IN ('OWNER', 'MANAGER')
        AND cm."leftAt" IS NULL
    )
    OR app_user_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS "company_members_select_policy" ON "company_members";

CREATE POLICY "company_members_select_policy" ON "company_members"
  FOR SELECT
  USING (
    "companyId" = app_current_company_id()
    OR "userId" = app_current_user_id()
    OR EXISTS (
      SELECT 1
      FROM "companies" c
      WHERE c."id" = "company_members"."companyId"
        AND c."isPublished" = true
        AND "company_members"."status" = 'ACTIVE'
        AND "company_members"."leftAt" IS NULL
    )
    OR app_user_role() = 'ADMIN'
  );
