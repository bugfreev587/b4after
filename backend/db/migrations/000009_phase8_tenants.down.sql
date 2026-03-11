-- Phase 8 rollback: Restore user-based ownership

-- Restore plan and stripe_customer_id on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan user_plan NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Restore user plan data from tenants
UPDATE users SET plan = t.plan, stripe_customer_id = t.stripe_customer_id
FROM tenants t WHERE users.id = t.owner_id;

-- Recreate team_members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role team_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_owner_id ON team_members(team_owner_id);

-- Drop tenant_id indexes
DROP INDEX IF EXISTS idx_comparisons_tenant_id;
DROP INDEX IF EXISTS idx_spaces_tenant_id;
DROP INDEX IF EXISTS idx_brands_tenant_id;
DROP INDEX IF EXISTS idx_galleries_tenant_id;
DROP INDEX IF EXISTS idx_reviews_tenant_id;
DROP INDEX IF EXISTS idx_timelines_tenant_id;
DROP INDEX IF EXISTS idx_leads_tenant_id;
DROP INDEX IF EXISTS idx_form_configs_tenant_id;
DROP INDEX IF EXISTS idx_achievements_tenant_id;
DROP INDEX IF EXISTS idx_content_calendar_tenant_id;
DROP INDEX IF EXISTS idx_content_calendar_settings_tenant_id;
DROP INDEX IF EXISTS idx_upload_requests_tenant_id;

-- Drop tenant_id columns from entity tables
ALTER TABLE comparisons DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE comparisons DROP COLUMN IF EXISTS created_by;
ALTER TABLE spaces DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE brands DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE galleries DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE reviews DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE timelines DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE leads DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE form_configs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE achievements DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE content_calendar DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE content_calendar_settings DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE upload_requests DROP COLUMN IF EXISTS tenant_id;

-- Drop tenant tables
DROP TABLE IF EXISTS tenant_invites;
DROP TABLE IF EXISTS tenant_members;
DROP TABLE IF EXISTS tenants;

-- Drop enums
DROP TYPE IF EXISTS tenant_invite_status;
DROP TYPE IF EXISTS tenant_member_status;
DROP TYPE IF EXISTS tenant_member_role;
