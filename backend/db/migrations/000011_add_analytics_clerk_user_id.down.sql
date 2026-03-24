DROP INDEX IF EXISTS idx_analytics_clerk_user_id;
ALTER TABLE analytics DROP COLUMN IF EXISTS clerk_user_id;
