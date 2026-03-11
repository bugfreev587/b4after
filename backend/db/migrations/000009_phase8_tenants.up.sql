-- Phase 8: Multi-Tenant Architecture

-- New enums
CREATE TYPE tenant_member_role AS ENUM ('owner', 'member');
CREATE TYPE tenant_member_status AS ENUM ('pending', 'active', 'removed');
CREATE TYPE tenant_invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

-- Tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plan user_plan NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Tenant members
CREATE TABLE tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role tenant_member_role NOT NULL DEFAULT 'member',
    invited_by TEXT REFERENCES users(id),
    joined_at TIMESTAMPTZ,
    status tenant_member_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);
CREATE INDEX idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user_id ON tenant_members(user_id);

-- Tenant invites
CREATE TABLE tenant_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role tenant_member_role NOT NULL DEFAULT 'member',
    token TEXT NOT NULL UNIQUE,
    invited_by TEXT NOT NULL REFERENCES users(id),
    status tenant_invite_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenant_invites_tenant_id ON tenant_invites(tenant_id);
CREATE INDEX idx_tenant_invites_token ON tenant_invites(token);

-- Add tenant_id to existing entity tables
ALTER TABLE comparisons ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE comparisons ADD COLUMN created_by TEXT REFERENCES users(id);
ALTER TABLE spaces ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE brands ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE galleries ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE timelines ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE leads ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE form_configs ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE achievements ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE content_calendar ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE content_calendar_settings ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE upload_requests ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Data migration: Create one tenant per user
INSERT INTO tenants (name, slug, plan, stripe_customer_id, owner_id)
SELECT
    COALESCE(NULLIF(u.name, ''), u.email) || '''s Workspace',
    'ws-' || SUBSTR(MD5(u.id), 1, 8),
    u.plan,
    u.stripe_customer_id,
    u.id
FROM users u;

-- Create owner tenant_member for each tenant
INSERT INTO tenant_members (tenant_id, user_id, role, status, joined_at)
SELECT t.id, t.owner_id, 'owner', 'active', now() FROM tenants t;

-- Backfill tenant_id on all entity tables
UPDATE comparisons SET tenant_id = t.id, created_by = comparisons.user_id
FROM tenants t WHERE comparisons.user_id = t.owner_id;

UPDATE spaces SET tenant_id = t.id
FROM tenants t WHERE spaces.user_id = t.owner_id;

UPDATE brands SET tenant_id = t.id
FROM tenants t WHERE brands.user_id = t.owner_id;

UPDATE galleries SET tenant_id = t.id
FROM tenants t WHERE galleries.user_id = t.owner_id;

UPDATE reviews SET tenant_id = t.id
FROM tenants t WHERE reviews.user_id = t.owner_id;

UPDATE timelines SET tenant_id = t.id
FROM tenants t WHERE timelines.user_id = t.owner_id;

UPDATE leads SET tenant_id = t.id
FROM tenants t WHERE leads.user_id = t.owner_id;

UPDATE form_configs SET tenant_id = t.id
FROM tenants t WHERE form_configs.user_id = t.owner_id;

UPDATE achievements SET tenant_id = t.id
FROM tenants t WHERE achievements.user_id = t.owner_id;

UPDATE content_calendar SET tenant_id = t.id
FROM tenants t WHERE content_calendar.user_id = t.owner_id;

UPDATE content_calendar_settings SET tenant_id = t.id
FROM tenants t WHERE content_calendar_settings.user_id = t.owner_id;

UPDATE upload_requests SET tenant_id = t.id
FROM tenants t WHERE upload_requests.user_id = t.owner_id;

-- Set tenant_id NOT NULL on all entity tables
ALTER TABLE comparisons ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE spaces ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE brands ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE galleries ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE reviews ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE timelines ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE leads ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE form_configs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE achievements ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE content_calendar ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE content_calendar_settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE upload_requests ALTER COLUMN tenant_id SET NOT NULL;

-- Add tenant_id indexes
CREATE INDEX idx_comparisons_tenant_id ON comparisons(tenant_id);
CREATE INDEX idx_spaces_tenant_id ON spaces(tenant_id);
CREATE INDEX idx_brands_tenant_id ON brands(tenant_id);
CREATE INDEX idx_galleries_tenant_id ON galleries(tenant_id);
CREATE INDEX idx_reviews_tenant_id ON reviews(tenant_id);
CREATE INDEX idx_timelines_tenant_id ON timelines(tenant_id);
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_form_configs_tenant_id ON form_configs(tenant_id);
CREATE INDEX idx_achievements_tenant_id ON achievements(tenant_id);
CREATE INDEX idx_content_calendar_tenant_id ON content_calendar(tenant_id);
CREATE INDEX idx_content_calendar_settings_tenant_id ON content_calendar_settings(tenant_id);
CREATE INDEX idx_upload_requests_tenant_id ON upload_requests(tenant_id);

-- Drop old team_members table (replaced by tenant_members)
DROP TABLE IF EXISTS team_members;

-- Remove plan and stripe_customer_id from users (now on tenants)
ALTER TABLE users DROP COLUMN IF EXISTS plan;
ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id;
