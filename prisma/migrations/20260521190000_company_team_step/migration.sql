-- Company step five: employee invitations and team management.

CREATE TABLE "company_invitations" (
  "id"              TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId"       TEXT         NOT NULL,
  "email"           VARCHAR(320) NOT NULL,
  "role"            "CompanyRole" NOT NULL DEFAULT 'MEMBER',
  "invitedByUserId" TEXT         NOT NULL,
  "token"           TEXT         NOT NULL,
  "expiresAt"       TIMESTAMP(3) NOT NULL,
  "acceptedAt"      TIMESTAMP(3),
  "revokedAt"       TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "company_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_invitations_token_key" ON "company_invitations"("token");
CREATE UNIQUE INDEX "company_invitations_companyId_email_key"
  ON "company_invitations"("companyId", "email");
CREATE INDEX "company_invitations_companyId_idx" ON "company_invitations"("companyId");
CREATE INDEX "company_invitations_email_idx" ON "company_invitations"("email");
CREATE INDEX "company_invitations_token_idx" ON "company_invitations"("token");
CREATE INDEX "company_invitations_expiresAt_idx" ON "company_invitations"("expiresAt");

ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_invitations" FORCE ROW LEVEL SECURITY;

CREATE POLICY "company_invitations_select_policy" ON "company_invitations"
  FOR SELECT
  USING (
    "companyId" = app_current_company_id()
    OR EXISTS (
      SELECT 1
      FROM "users" u
      WHERE u."id" = app_current_user_id()
        AND lower(u."email") = lower("company_invitations"."email")
    )
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_invitations_insert_policy" ON "company_invitations"
  FOR INSERT
  WITH CHECK (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_invitations_update_policy" ON "company_invitations"
  FOR UPDATE
  USING (
    "companyId" = app_current_company_id()
    OR EXISTS (
      SELECT 1
      FROM "users" u
      WHERE u."id" = app_current_user_id()
        AND lower(u."email") = lower("company_invitations"."email")
    )
    OR app_user_role() = 'ADMIN'
  )
  WITH CHECK (
    "companyId" = app_current_company_id()
    OR EXISTS (
      SELECT 1
      FROM "users" u
      WHERE u."id" = app_current_user_id()
        AND lower(u."email") = lower("company_invitations"."email")
    )
    OR app_user_role() = 'ADMIN'
  );

CREATE POLICY "company_invitations_delete_policy" ON "company_invitations"
  FOR DELETE
  USING (
    "companyId" = app_current_company_id()
    OR app_user_role() = 'ADMIN'
  );
