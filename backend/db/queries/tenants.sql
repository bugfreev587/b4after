-- name: CreateTenant :one
INSERT INTO tenants (name, slug, plan, owner_id)
VALUES ($1, $2, $3, $4) RETURNING *;

-- name: GetTenantByID :one
SELECT * FROM tenants WHERE id = $1;

-- name: GetTenantBySlug :one
SELECT * FROM tenants WHERE slug = $1;

-- name: GetTenantByOwnerID :one
SELECT * FROM tenants WHERE owner_id = $1;

-- name: GetTenantForUser :one
SELECT t.id, t.name, t.slug, t.plan, t.stripe_customer_id, t.stripe_subscription_id, t.owner_id,
       tm.role, t.created_at, t.updated_at
FROM tenants t
JOIN tenant_members tm ON tm.tenant_id = t.id
WHERE tm.user_id = $1 AND tm.status = 'active'
LIMIT 1;

-- name: UpdateTenant :one
UPDATE tenants SET name = $2, slug = $3 WHERE id = $1 RETURNING *;

-- name: UpdateTenantPlan :exec
UPDATE tenants SET plan = $2, stripe_customer_id = $3, stripe_subscription_id = $4 WHERE id = $1;

-- name: ListTenantsForUser :many
SELECT t.*, tm.role FROM tenants t
JOIN tenant_members tm ON tm.tenant_id = t.id
WHERE tm.user_id = $1 AND tm.status = 'active'
ORDER BY t.created_at ASC;

-- name: CreateTenantMember :one
INSERT INTO tenant_members (tenant_id, user_id, role, invited_by, status, joined_at)
VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;

-- name: GetTenantMemberByUserID :one
SELECT * FROM tenant_members WHERE tenant_id = $1 AND user_id = $2;

-- name: ListTenantMembers :many
SELECT tm.*, u.email AS member_email, u.name AS member_name, u.avatar_url AS member_avatar_url
FROM tenant_members tm
JOIN users u ON u.id = tm.user_id
WHERE tm.tenant_id = $1 AND tm.status = 'active'
ORDER BY tm.created_at ASC;

-- name: RemoveTenantMember :exec
UPDATE tenant_members SET status = 'removed' WHERE id = $1;

-- name: CountActiveTenantMembers :one
SELECT COUNT(*) FROM tenant_members WHERE tenant_id = $1 AND status = 'active';

-- name: CreateTenantInvite :one
INSERT INTO tenant_invites (tenant_id, email, role, token, invited_by)
VALUES ($1, $2, $3, $4, $5) RETURNING *;

-- name: GetTenantInviteByToken :one
SELECT * FROM tenant_invites WHERE token = $1;

-- name: GetTenantInviteByID :one
SELECT * FROM tenant_invites WHERE id = $1;

-- name: ListTenantInvites :many
SELECT * FROM tenant_invites WHERE tenant_id = $1 AND status = 'pending'
ORDER BY created_at DESC;

-- name: CancelTenantInvite :exec
UPDATE tenant_invites SET status = 'cancelled' WHERE id = $1;

-- name: AcceptTenantInvite :exec
UPDATE tenant_invites SET status = 'accepted' WHERE id = $1;

-- name: DeleteTenant :exec
DELETE FROM tenants WHERE id = $1;
