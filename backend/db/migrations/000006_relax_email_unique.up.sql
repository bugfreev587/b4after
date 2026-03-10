-- Drop UNIQUE constraint on email since Clerk manages email uniqueness
-- and users may be lazily created with empty email from JWT middleware
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users ALTER COLUMN email SET DEFAULT '';
