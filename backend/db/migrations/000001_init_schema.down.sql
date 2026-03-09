DROP TRIGGER IF EXISTS galleries_updated_at ON galleries;
DROP TRIGGER IF EXISTS comparisons_updated_at ON comparisons;
DROP TRIGGER IF EXISTS brands_updated_at ON brands;
DROP TRIGGER IF EXISTS users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at();

DROP TABLE IF EXISTS gallery_comparisons;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS galleries;
DROP TABLE IF EXISTS analytics;
DROP TABLE IF EXISTS comparisons;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS team_role;
DROP TYPE IF EXISTS device_type;
DROP TYPE IF EXISTS analytics_event_type;
DROP TYPE IF EXISTS comparison_category;
DROP TYPE IF EXISTS user_plan;
