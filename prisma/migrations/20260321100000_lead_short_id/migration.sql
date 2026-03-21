-- Remove UUID default from leads.id — new leads will use short IDs generated in application code.
-- Existing UUID-based IDs remain unchanged.
ALTER TABLE "leads" ALTER COLUMN "id" DROP DEFAULT;
