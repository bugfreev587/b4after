DROP INDEX IF EXISTS idx_users_custom_subdomain;
ALTER TABLE users DROP COLUMN IF EXISTS custom_subdomain;
