-- ============================================================================
-- Master-Hub Scalability Migration
-- Run this ONCE against your production database before deploying the new code.
-- Safe to run multiple times (all statements are idempotent via IF NOT EXISTS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Full-Text Search: tsvector column + GIN index on masters table
--    Enables PostgreSQL full-text search instead of slow ILIKE '%term%' scans.
-- ----------------------------------------------------------------------------

-- Add the search_vector column (no-op if already exists)
ALTER TABLE masters ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate search_vector for all existing masters
UPDATE masters m
SET search_vector =
    setweight(to_tsvector('russian',
        COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')
    ), 'A') ||
    setweight(to_tsvector('russian', COALESCE(m.description, '')), 'B') ||
    setweight(to_tsvector('simple',  COALESCE(m.slug, '')), 'D')
FROM users u
WHERE u.id = m."userId";

-- Create GIN index for fast full-text lookup
CREATE INDEX IF NOT EXISTS idx_masters_search_vector
    ON masters USING GIN(search_vector);

-- Trigger function: keep search_vector up-to-date when master's own fields change
CREATE OR REPLACE FUNCTION trg_masters_search_vector() RETURNS trigger AS $$
DECLARE
    v_first_name TEXT;
    v_last_name  TEXT;
BEGIN
    -- Fetch latest user name
    SELECT "firstName", "lastName"
    INTO v_first_name, v_last_name
    FROM users
    WHERE id = NEW."userId";

    NEW.search_vector :=
        setweight(to_tsvector('russian',
            COALESCE(v_first_name, '') || ' ' || COALESCE(v_last_name, '')
        ), 'A') ||
        setweight(to_tsvector('russian', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('simple',  COALESCE(NEW.slug, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to masters (fires on INSERT or UPDATE of relevant columns)
DROP TRIGGER IF EXISTS trg_masters_search_vector ON masters;
CREATE TRIGGER trg_masters_search_vector
    BEFORE INSERT OR UPDATE OF description, slug, "userId"
    ON masters
    FOR EACH ROW EXECUTE FUNCTION trg_masters_search_vector();


-- ----------------------------------------------------------------------------
-- 2. Additional performance indexes (safe, use CONCURRENTLY to avoid locks)
-- ----------------------------------------------------------------------------

-- Composite index for the most common search filter: category + city + tariff + rating
CREATE INDEX IF NOT EXISTS idx_masters_search_main
    ON masters("categoryId", "cityId", "tariffType", rating DESC, "isFeatured")
    WHERE "categoryId" IS NOT NULL AND "cityId" IS NOT NULL;

-- Index for "available now" filter
CREATE INDEX IF NOT EXISTS idx_masters_available_now
    ON masters("isOnline", "availabilityStatus", "categoryId", "cityId")
    WHERE "isOnline" = true AND "availabilityStatus" = 'AVAILABLE';

-- Index for tariff expiry checks
CREATE INDEX IF NOT EXISTS idx_masters_tariff_expiry
    ON masters("tariffType", "tariffExpiresAt")
    WHERE "tariffType" != 'BASIC';
