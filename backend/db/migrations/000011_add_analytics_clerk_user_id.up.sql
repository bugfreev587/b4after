-- Add clerk_user_id to analytics so we can filter out comparison owners' own views
ALTER TABLE analytics ADD COLUMN clerk_user_id TEXT;
CREATE INDEX idx_analytics_clerk_user_id ON analytics(clerk_user_id);
