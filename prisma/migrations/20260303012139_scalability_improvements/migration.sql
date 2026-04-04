-- ============================================================================
-- faber.md Scalability Migration
-- Run this ONCE against your production database before deploying the new code.
-- Safe to run multiple times (all statements are idempotent via IF NOT EXISTS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Full-Text Search: колонка search_vector + триггер пересчёта (без GIN в Prisma-схеме)
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


-- Дополнительные частичные индексы под поиск не создаём здесь: в schema.prisma у Master нет @@index под них;
-- при необходимости добавь объявление в Prisma и сгенерируй отдельную миграцию.
