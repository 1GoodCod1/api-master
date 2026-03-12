/**
 * Jest setup - runs before any test files.
 * Sets env vars required by modules that throw at load time.
 */
process.env.ID_ENCRYPTION_SECRET =
  process.env.ID_ENCRYPTION_SECRET || 'a'.repeat(32);
