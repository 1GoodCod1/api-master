-- Set referrals program to disabled (closed) by default
UPDATE "app_settings"
SET "value" = 'false', "updatedAt" = NOW()
WHERE "key" = 'referrals_enabled' AND "value" = 'true';
