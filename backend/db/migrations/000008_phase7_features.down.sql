-- Drop content calendar settings
DROP TRIGGER IF EXISTS content_calendar_settings_updated_at ON content_calendar_settings;
DROP TABLE IF EXISTS content_calendar_settings;

-- Drop content calendar
DROP TABLE IF EXISTS content_calendar;

-- Drop achievements
DROP TABLE IF EXISTS achievements;

-- Drop industry benchmarks
DROP TABLE IF EXISTS industry_benchmarks;

-- Drop form configs
DROP TRIGGER IF EXISTS form_configs_updated_at ON form_configs;
DROP TABLE IF EXISTS form_configs;

-- Drop leads
DROP TRIGGER IF EXISTS leads_updated_at ON leads;
DROP TABLE IF EXISTS leads;

-- Drop timeline entries
DROP TABLE IF EXISTS timeline_entries;

-- Drop timelines
DROP TRIGGER IF EXISTS timelines_updated_at ON timelines;
DROP TABLE IF EXISTS timelines;

-- Drop reviews
DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
DROP TABLE IF EXISTS reviews;

-- Drop enums
DROP TYPE IF EXISTS calendar_status;
DROP TYPE IF EXISTS content_platform;
DROP TYPE IF EXISTS content_type;
DROP TYPE IF EXISTS benchmark_metric;
DROP TYPE IF EXISTS form_type;
DROP TYPE IF EXISTS lead_status;
DROP TYPE IF EXISTS lead_type;
DROP TYPE IF EXISTS review_status;
