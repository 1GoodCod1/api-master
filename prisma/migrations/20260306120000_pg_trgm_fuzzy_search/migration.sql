-- Enable pg_trgm extension for fuzzy/typo-tolerant search.
-- Required for word_similarity() in masters search (handles typos like "сантехнк" -> "сантехник").
-- If your DB doesn't allow CREATE EXTENSION, enable pg_trgm manually in the DB admin.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
