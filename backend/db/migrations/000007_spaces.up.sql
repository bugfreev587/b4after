-- New enums
CREATE TYPE cta_type AS ENUM ('link', 'button', 'none');
CREATE TYPE upload_request_type AS ENUM ('before_only', 'after_only', 'both');
CREATE TYPE upload_request_status AS ENUM ('sent', 'opened', 'submitted', 'approved', 'rejected', 'expired');
CREATE TYPE upload_request_sent_via AS ENUM ('email', 'sms', 'manual_link');
CREATE TYPE comparison_source AS ENUM ('merchant', 'client');

-- Spaces table
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category comparison_category NOT NULL DEFAULT 'other',
    cover_image_url TEXT,
    services JSONB DEFAULT '[]',
    cta_text TEXT,
    cta_url TEXT,
    cta_type cta_type NOT NULL DEFAULT 'none',
    is_public BOOLEAN NOT NULL DEFAULT true,
    subdomain TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spaces_user_id ON spaces(user_id);
CREATE INDEX idx_spaces_slug ON spaces(slug);

CREATE TRIGGER spaces_updated_at BEFORE UPDATE ON spaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Upload requests table
CREATE TABLE upload_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    client_name TEXT,
    client_email TEXT,
    client_phone TEXT,
    request_type upload_request_type NOT NULL DEFAULT 'both',
    instruction_note TEXT,
    before_image_url TEXT,
    after_image_url TEXT,
    review_rating INTEGER,
    review_content TEXT,
    service_type TEXT,
    status upload_request_status NOT NULL DEFAULT 'sent',
    sent_via upload_request_sent_via NOT NULL DEFAULT 'manual_link',
    reminder_sent_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_upload_requests_space_id ON upload_requests(space_id);
CREATE INDEX idx_upload_requests_user_id ON upload_requests(user_id);
CREATE INDEX idx_upload_requests_token ON upload_requests(token);

CREATE TRIGGER upload_requests_updated_at BEFORE UPDATE ON upload_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add space_id, source, upload_request_id to comparisons
ALTER TABLE comparisons ADD COLUMN space_id UUID REFERENCES spaces(id) ON DELETE SET NULL;
ALTER TABLE comparisons ADD COLUMN source comparison_source NOT NULL DEFAULT 'merchant';
ALTER TABLE comparisons ADD COLUMN upload_request_id UUID REFERENCES upload_requests(id) ON DELETE SET NULL;

-- Data migration: create default space per user who has comparisons
INSERT INTO spaces (user_id, slug, name, description, category)
SELECT DISTINCT c.user_id,
    'my-comparisons-' || SUBSTR(MD5(c.user_id), 1, 6),
    'My Comparisons',
    'Default space for existing comparisons',
    'other'::comparison_category
FROM comparisons c;

-- Assign existing comparisons to their user's default space
UPDATE comparisons SET space_id = s.id
FROM spaces s
WHERE comparisons.user_id = s.user_id AND s.name = 'My Comparisons' AND comparisons.space_id IS NULL;

-- Now make space_id NOT NULL
ALTER TABLE comparisons ALTER COLUMN space_id SET NOT NULL;

CREATE INDEX idx_comparisons_space_id ON comparisons(space_id);
