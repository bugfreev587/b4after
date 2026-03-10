-- Re-add UNIQUE constraint on email
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE users ALTER COLUMN email DROP DEFAULT;
