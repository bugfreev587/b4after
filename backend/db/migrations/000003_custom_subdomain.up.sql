ALTER TABLE users ADD COLUMN custom_subdomain TEXT UNIQUE;
CREATE INDEX idx_users_custom_subdomain ON users(custom_subdomain);
