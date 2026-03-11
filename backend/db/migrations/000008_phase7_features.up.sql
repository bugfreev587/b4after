-- Phase 7.1-7.6: Reviews, Timelines, QR Materials, Leads, Benchmarks, Content Calendar

-- New enums
CREATE TYPE review_status AS ENUM ('pending', 'published', 'hidden');
CREATE TYPE lead_type AS ENUM ('contact', 'booking');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'booked', 'completed', 'cancelled');
CREATE TYPE form_type AS ENUM ('contact', 'booking', 'both');
CREATE TYPE benchmark_metric AS ENUM ('avg_views', 'avg_rating', 'conversion_rate', 'comparisons_count');
CREATE TYPE content_type AS ENUM ('before_after', 'review_quote', 'timeline', 'tip');
CREATE TYPE content_platform AS ENUM ('instagram', 'facebook', 'tiktok', 'twitter');
CREATE TYPE calendar_status AS ENUM ('scheduled', 'published', 'skipped');

-- Reviews
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comparison_id UUID REFERENCES comparisons(id) ON DELETE SET NULL,
    space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_name TEXT NOT NULL,
    reviewer_photo_url TEXT,
    reviewer_contact TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL,
    reply TEXT,
    reply_at TIMESTAMPTZ,
    status review_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_comparison_id ON reviews(comparison_id);
CREATE INDEX idx_reviews_space_id ON reviews(space_id);
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Timelines
CREATE TABLE timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    cta_text TEXT,
    cta_url TEXT,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_timelines_user_id ON timelines(user_id);
CREATE INDEX idx_timelines_slug ON timelines(slug);
CREATE TRIGGER timelines_updated_at BEFORE UPDATE ON timelines FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Timeline entries
CREATE TABLE timeline_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeline_id UUID NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    label TEXT NOT NULL,
    date DATE,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_timeline_entries_timeline_id ON timeline_entries(timeline_id);

-- Leads
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comparison_id UUID REFERENCES comparisons(id) ON DELETE SET NULL,
    space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
    type lead_type NOT NULL DEFAULT 'contact',
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    service TEXT,
    preferred_date TEXT,
    preferred_time TEXT,
    message TEXT,
    status lead_status NOT NULL DEFAULT 'new',
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Form configs
CREATE TABLE form_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    form_type form_type NOT NULL DEFAULT 'contact',
    services JSONB DEFAULT '[]',
    whatsapp_number TEXT,
    auto_reply_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER form_configs_updated_at BEFORE UPDATE ON form_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Industry benchmarks
CREATE TABLE industry_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    metric benchmark_metric NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    sample_size INTEGER NOT NULL DEFAULT 0,
    percentiles JSONB DEFAULT '{}',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(category, metric)
);

-- Achievements
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, type)
);
CREATE INDEX idx_achievements_user_id ON achievements(user_id);

-- Content calendar
CREATE TABLE content_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comparison_id UUID REFERENCES comparisons(id) ON DELETE SET NULL,
    review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    content_type content_type NOT NULL,
    platform content_platform NOT NULL,
    caption_template TEXT,
    status calendar_status NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_content_calendar_user_id ON content_calendar(user_id);
CREATE INDEX idx_content_calendar_scheduled_date ON content_calendar(scheduled_date);

-- Content calendar settings
CREATE TABLE content_calendar_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    weekly_frequency INTEGER NOT NULL DEFAULT 3,
    preferred_platforms JSONB DEFAULT '["instagram"]',
    preferred_content_types JSONB DEFAULT '["before_after"]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER content_calendar_settings_updated_at BEFORE UPDATE ON content_calendar_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
