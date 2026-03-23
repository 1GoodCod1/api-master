-- Category: translations + Lucide icon key + optional image URL
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "iconKey" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "iconUrl" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "translations" JSONB;

-- City: translations
ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "translations" JSONB;
