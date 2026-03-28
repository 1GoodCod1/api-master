-- Prisma schema lists VERIFICATION_DATA_PROCESSING; initial enum migration only had four values.
-- Compatible with PostgreSQL 9.1+ (IF NOT EXISTS for ADD VALUE requires PostgreSQL 15+).
DO $$
BEGIN
  ALTER TYPE "ConsentType" ADD VALUE 'VERIFICATION_DATA_PROCESSING';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
